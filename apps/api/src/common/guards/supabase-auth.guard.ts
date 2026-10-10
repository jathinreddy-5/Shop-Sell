import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import {
  AuthUserPayload,
  UserRole,
  validateJwtSecret,
  validateSupabaseJwtSecret,
  logSecurityAlert,
} from '@shop-sell/shared';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    let token: string | null = null;

    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (request.cookies?.shopsell_token) {
      token = request.cookies.shopsell_token;
    } else if (request.headers.cookie) {
      const match = request.headers.cookie.match(/(?:^|;\s*)shopsell_token=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }

    if (!token) {
      if (isPublic) {
        return true;
      }
      throw new UnauthorizedException('Missing or invalid Authorization header or session cookie');
    }

    // Resolve JWT secrets: primary from JWT_SECRET or SUPABASE_JWT_SECRET
    const rawPrimary = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
    const primarySecret = validateJwtSecret(rawPrimary, process.env.NODE_ENV);
    const supabaseSecret = validateSupabaseJwtSecret(
      process.env.SUPABASE_JWT_SECRET,
      process.env.NODE_ENV
    );

    let decoded: any;
    try {
      // Cryptographically verify token signature with pinned HS256 algorithm
      try {
        decoded = jwt.verify(token, primarySecret, { algorithms: ['HS256'] });
      } catch (err: any) {
        // If primary verification failed with signature error and distinct SUPABASE_JWT_SECRET is configured, try it
        if (
          supabaseSecret &&
          supabaseSecret !== primarySecret &&
          (err.name === 'JsonWebTokenError' && err.message.includes('signature'))
        ) {
          decoded = jwt.verify(token, supabaseSecret, { algorithms: ['HS256'] });
        } else {
          throw err;
        }
      }

      // 1. Audience verification: reject admin tokens on customer endpoints
      if (decoded.aud) {
        const audList = Array.isArray(decoded.aud) ? decoded.aud : [decoded.aud];
        if (audList.includes('shopsell-admin') || audList.includes('admin')) {
          throw new UnauthorizedException('Administrative tokens are not permitted on customer endpoints');
        }
        const allowedAudiences = [
          'authenticated',
          'shopsell',
          'shopsell-app',
          'shopsell-customer',
          'shopsell-impersonation',
        ];
        const isAudValid = audList.some((a: string) => allowedAudiences.includes(a));
        if (!isAudValid) {
          throw new UnauthorizedException(`Invalid token audience: ${decoded.aud}`);
        }
      }

      // 2. Issuer verification if issuer claim is present
      if (decoded.iss) {
        const allowedIssuers = ['shopsell', 'shopsell-api', 'supabase', process.env.SUPABASE_URL].filter(
          Boolean
        );
        if (!allowedIssuers.includes(decoded.iss)) {
          throw new UnauthorizedException(`Invalid token issuer: ${decoded.iss}`);
        }
      }

      // Extract user claims and roles (roles only from app_metadata or server-side tables)
      const appMetadata = decoded.app_metadata || {};
      const userMetadata = decoded.user_metadata || {};

      const roles: UserRole[] = Array.isArray(appMetadata.roles)
        ? appMetadata.roles
        : ['customer'];

      const isImpersonation =
        decoded.aud === 'shopsell-impersonation' ||
        decoded.is_impersonation === true ||
        decoded.typ === 'impersonation';

      // 3. Enforce strict read-only semantics for impersonation sessions
      if (isImpersonation) {
        const method = (request.method || '').toUpperCase();
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          logSecurityAlert({
            eventType: 'FAILED_LOGIN',
            ip: request.ip || 'unknown',
            reason: `Impersonation session attempted forbidden mutation [${method} ${request.url}]`,
          });
          throw new ForbiddenException('Impersonation sessions are strictly read-only');
        }
      }

      const userPayload: AuthUserPayload & { is_impersonation?: boolean; read_only?: boolean } = {
        sub: decoded.sub,
        email: decoded.email,
        roles: roles,
        app_metadata: appMetadata,
        user_metadata: userMetadata,
        is_impersonation: isImpersonation,
        read_only: isImpersonation,
      };

      request.user = userPayload;
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      if (isPublic) {
        return true;
      }
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}
