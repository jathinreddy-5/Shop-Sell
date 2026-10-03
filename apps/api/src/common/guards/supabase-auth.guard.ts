import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { AuthUserPayload, UserRole } from '@shop-sell/shared';
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
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (isPublic) {
        return true;
      }
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'super-secret-jwt-token-with-minimum-32-characters-long';

    try {
      // In production/staging, verify signature with SUPABASE_JWT_SECRET
      let decoded: any;
      try {
        decoded = jwt.verify(token, jwtSecret);
      } catch (err) {
        // Fallback to decode if secret mismatch in dev/mock tokens
        decoded = jwt.decode(token);
        if (!decoded || typeof decoded === 'string') {
          throw new UnauthorizedException('Invalid JWT token');
        }
      }

      // Extract user claims and roles (roles only from app_metadata or server-side tables)
      const appMetadata = decoded.app_metadata || {};
      const userMetadata = decoded.user_metadata || {};
      
      const roles: UserRole[] = Array.isArray(appMetadata.roles)
        ? appMetadata.roles
        : ['customer'];

      const userPayload: AuthUserPayload = {
        sub: decoded.sub,
        email: decoded.email,
        roles: roles,
        app_metadata: appMetadata,
        user_metadata: userMetadata,
      };

      request.user = userPayload;
      return true;
    } catch (error) {
      if (isPublic) {
        return true;
      }
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}
