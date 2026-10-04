import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert';
import { NestFactory } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../app.module';
import { AdminAuthGuard } from '../modules/admin-core/rbac/admin-auth.guard';
import { AuditInterceptor } from '../modules/admin-core/audit/audit.interceptor';
import { SellersController } from '../modules/sellers/sellers.controller';
import { PayoutsController } from '../modules/payouts/payouts.controller';
import { AdminAuthService } from '../modules/admin-core/auth/admin-auth.service';
import { AdminRedisService } from '../modules/admin-core/redis/admin-redis.service';

describe('Phase 1b Item 0b: DI and Route Guard Proof for Migrated Endpoints', () => {
  let app: INestApplication;
  let baseUrl: string;
  let customerToken: string;
  let attackerToken: string;

  before(async () => {
    // Boot real AppModule with NestFactory
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api');
    await app.listen(0);

    const server = app.getHttpServer();
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const auth = app.get(AdminAuthService);
    const redis = app.get(AdminRedisService);
    const secret = (auth as any).jwtSecret;

    // Create active session in Redis for a customer user who has no row in public.admin_users
    const custSessionId = 'cust-session-di-test';
    await redis.set(`admin:session_active:${custSessionId}`, '1', 60);
    customerToken = jwt.sign(
      {
        sub: '11111111-1111-1111-1111-111111111111',
        session_id: custSessionId,
        roles: ['customer'],
      },
      secret,
      { expiresIn: '1h' }
    );

    // Create active session for attacker attempting user_metadata spoofing
    const attackerSessionId = 'attacker-session-di-test';
    await redis.set(`admin:session_active:${attackerSessionId}`, '1', 60);
    attackerToken = jwt.sign(
      {
        sub: '22222222-2222-2222-2222-222222222222',
        session_id: attackerSessionId,
        roles: ['customer'],
        user_metadata: { roles: ['admin'] },
      },
      secret,
      { expiresIn: '1h' }
    );
  });

  after(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should successfully resolve AdminAuthGuard and AuditInterceptor in Nest DI container', () => {
    const guard = app.get(AdminAuthGuard);
    const interceptor = app.get(AuditInterceptor);
    const sellersCtrl = app.get(SellersController);
    const payoutsCtrl = app.get(PayoutsController);

    assert.ok(guard, 'AdminAuthGuard must be resolvable via DI');
    assert.ok(interceptor, 'AuditInterceptor must be resolvable via DI');
    assert.ok(sellersCtrl, 'SellersController must be resolvable via DI');
    assert.ok(payoutsCtrl, 'PayoutsController must be resolvable via DI');
  });

  const routes = [
    { name: 'GET /api/sellers/admin/applications', method: 'GET', path: '/api/sellers/admin/applications' },
    {
      name: 'PATCH /api/sellers/admin/applications/:id/review',
      method: 'PATCH',
      path: '/api/sellers/admin/applications/00000000-0000-0000-0000-000000000001/review',
      body: {},
    },
    { name: 'POST /api/payouts/batches/generate', method: 'POST', path: '/api/payouts/batches/generate' },
    {
      name: 'PATCH /api/payouts/:id/status',
      method: 'PATCH',
      path: '/api/payouts/00000000-0000-0000-0000-000000000001/status',
      body: { status: 'paid' },
    },
  ];

  for (const r of routes) {
    it(`should enforce 401 for unauthenticated request on ${r.name}`, async () => {
      const res = await fetch(`${baseUrl}${r.path}`, {
        method: r.method,
        headers: { 'Content-Type': 'application/json' },
        body: r.body ? JSON.stringify(r.body) : undefined,
      });
      assert.strictEqual(res.status, 401, `Expected 401 Unauthorized for missing token on ${r.name}`);
    });

    it(`should enforce 403 for authenticated customer token on ${r.name}`, async () => {
      const res = await fetch(`${baseUrl}${r.path}`, {
        method: r.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: r.body ? JSON.stringify(r.body) : undefined,
      });
      assert.strictEqual(res.status, 403, `Expected 403 Forbidden for customer token on ${r.name}`);
    });

    it(`should enforce 403 for attacker token with user_metadata.roles=['admin'] on ${r.name}`, async () => {
      const res = await fetch(`${baseUrl}${r.path}`, {
        method: r.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${attackerToken}`,
        },
        body: r.body ? JSON.stringify(r.body) : undefined,
      });
      assert.strictEqual(res.status, 403, `Expected 403 Forbidden for tampered user_metadata token on ${r.name}`);
    });
  }
});
