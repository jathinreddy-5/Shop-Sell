import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as jwt from 'jsonwebtoken';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
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

describe('Phase 1b Item 0a: SupabaseAuthGuard Role Source Hardening', () => {
  const jwtSecret = 'super-secret-jwt-token-with-minimum-32-characters-long';
  process.env.SUPABASE_JWT_SECRET = jwtSecret;

  it('should assign customer role only when roles exist solely in user_metadata (preventing self-promotion)', () => {
    const reflector = new Reflector();
    const guard = new SupabaseAuthGuard(reflector);

    // Attacker crafts or client updates user_metadata to include admin and owner
    const maliciousToken = jwt.sign(
      {
        sub: 'user-attacker-123',
        email: 'attacker@example.com',
        user_metadata: {
          roles: ['admin', 'owner'],
        },
        // No app_metadata or no app_metadata.roles
      },
      jwtSecret
    );

    const { context, req } = createMockContext(
      reflector,
      { authorization: `Bearer ${maliciousToken}` },
      undefined,
      { isPublic: false }
    );

    const allowed = guard.canActivate(context);
    assert.strictEqual(allowed, true);
    // CRITICAL SECURITY ASSERTION: roles must only be ['customer']
    assert.deepStrictEqual(req.user.roles, ['customer'], 'User must NOT receive roles from user_metadata');
  });

  it('should derive roles exclusively from app_metadata and ignore user_metadata tampering', () => {
    const reflector = new Reflector();
    const guard = new SupabaseAuthGuard(reflector);

    // Valid token where app_metadata has customer, but user_metadata attempts to inject admin
    const token = jwt.sign(
      {
        sub: 'user-legit-456',
        email: 'legit@example.com',
        app_metadata: {
          provider: 'email',
          roles: ['customer'],
        },
        user_metadata: {
          roles: ['admin'],
        },
      },
      jwtSecret
    );

    const { context, req } = createMockContext(
      reflector,
      { authorization: `Bearer ${token}` },
      undefined,
      { isPublic: false }
    );

    const allowed = guard.canActivate(context);
    assert.strictEqual(allowed, true);
    assert.deepStrictEqual(req.user.roles, ['customer'], 'Roles must strictly reflect app_metadata');
  });

  it('should allow legitimate owner role when granted via app_metadata', () => {
    const reflector = new Reflector();
    const guard = new SupabaseAuthGuard(reflector);

    const ownerToken = jwt.sign(
      {
        sub: 'user-seller-789',
        email: 'seller@example.com',
        app_metadata: {
          provider: 'email',
          roles: ['customer', 'owner'],
        },
        user_metadata: {},
      },
      jwtSecret
    );

    const { context, req } = createMockContext(
      reflector,
      { authorization: `Bearer ${ownerToken}` },
      undefined,
      { isPublic: false }
    );

    const allowed = guard.canActivate(context);
    assert.strictEqual(allowed, true);
    assert.deepStrictEqual(req.user.roles, ['customer', 'owner'], 'Legitimate app_metadata roles must be honored');
  });
});
