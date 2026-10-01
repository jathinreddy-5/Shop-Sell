import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as jwt from 'jsonwebtoken';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';

function createMockContext(
  reflector: Reflector,
  headers: Record<string, string> = {},
  user?: any,
  metadata?: { roles?: string[]; isPublic?: boolean }
): { context: ExecutionContext; req: any } {
  const req: any = { headers, user };

  const mockContext: any = {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
    getHandler: () => () => {},
    getClass: () => class {},
  };

  reflector.getAllAndOverride = ((key: string) => {
    if (key === ROLES_KEY) return metadata?.roles;
    if (key === IS_PUBLIC_KEY) return metadata?.isPublic;
    return undefined;
  }) as any;

  return { context: mockContext, req };
}

describe('Auth & Roles Guards Suite', () => {
  const jwtSecret = 'super-secret-jwt-token-with-minimum-32-characters-long';
  process.env.SUPABASE_JWT_SECRET = jwtSecret;

  it('should reject request without Bearer token on protected route', () => {
    const reflector = new Reflector();
    const guard = new SupabaseAuthGuard(reflector);
    const { context } = createMockContext(reflector, {}, undefined, { isPublic: false });

    assert.throws(
      () => guard.canActivate(context),
      UnauthorizedException
    );
  });

  it('should allow public route without Bearer token', () => {
    const reflector = new Reflector();
    const guard = new SupabaseAuthGuard(reflector);
    const { context } = createMockContext(reflector, {}, undefined, { isPublic: true });

    const result = guard.canActivate(context);
    assert.strictEqual(result, true);
  });

  it('should verify valid JWT and attach user with customer role', () => {
    const reflector = new Reflector();
    const guard = new SupabaseAuthGuard(reflector);
    const token = jwt.sign(
      { sub: 'usr-12345', email: 'customer@example.com', app_metadata: { roles: ['customer'] } },
      jwtSecret
    );
    const { context, req } = createMockContext(reflector, { authorization: `Bearer ${token}` });

    const canActivate = guard.canActivate(context);
    assert.strictEqual(canActivate, true);
    assert.strictEqual(req.user.sub, 'usr-12345');
    assert.deepStrictEqual(req.user.roles, ['customer']);
  });

  it('RolesGuard should forbid customer from accessing owner-only route', () => {
    const reflector = new Reflector();
    const rolesGuard = new RolesGuard(reflector);
    const { context } = createMockContext(reflector, {}, { sub: 'usr-123', roles: ['customer'] }, { roles: ['owner'] });

    assert.throws(
      () => rolesGuard.canActivate(context),
      ForbiddenException
    );
  });

  it('RolesGuard should allow dual-role user [customer, owner] to access owner route', () => {
    const reflector = new Reflector();
    const rolesGuard = new RolesGuard(reflector);
    const { context } = createMockContext(
      reflector,
      {},
      { sub: 'usr-owner-123', roles: ['customer', 'owner'] },
      { roles: ['owner'] }
    );

    const result = rolesGuard.canActivate(context);
    assert.strictEqual(result, true);
  });

  it('RolesGuard should allow admin to access owner-only and customer-only routes', () => {
    const reflector = new Reflector();
    const rolesGuard = new RolesGuard(reflector);
    const { context } = createMockContext(
      reflector,
      {},
      { sub: 'admin-123', roles: ['admin'] },
      { roles: ['owner'] }
    );

    const result = rolesGuard.canActivate(context);
    assert.strictEqual(result, true);
  });
});
