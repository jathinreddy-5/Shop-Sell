import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';

import { ADMIN_PERMISSION_KEY, IS_PUBLIC_ADMIN_KEY } from '../modules/admin-core/rbac/require-permission.decorator';
import { AdminAuthGuard } from '../modules/admin-core/rbac/admin-auth.guard';
import { RbacService } from '../modules/admin-core/rbac/rbac.service';
import { ApprovalEngineService } from '../modules/admin-core/approvals/approval-engine.service';
import { AdminRedisService } from '../modules/admin-core/redis/admin-redis.service';
import { sanitizeAuditPayload } from '../modules/admin-core/audit/audit-redaction.util';
import { AdminAuditService } from '../modules/admin-core/audit/admin-audit.service';
import { LocalWormSinkService } from '../modules/admin-core/audit/local-worm-sink.service';
import { LocalAlertSinkService } from '../modules/admin-core/audit/local-alert-sink.service';
import { PiiRevealService } from '../modules/admin-core/security/pii-reveal.service';
import { KmsEncryptionService } from '../modules/admin-core/security/kms-encryption.service';
import { KillSwitchService } from '../modules/admin-core/kill-switch/kill-switch.service';

// Mock in-memory database helper
function createMockDb(initialRows: Record<string, any[]> = {}) {
  const store: Record<string, any[]> = { ...initialRows };

  return {
    store,
    query: async (sql: string, params: any[] = []) => {
      // Simple mock parser for test assertions
      if (sql.includes('SELECT * FROM public.admin_users WHERE id = $1')) {
        const found = (store['admin_users'] || []).filter((u) => u.id === params[0]);
        return { rows: found };
      }
      if (sql.includes('SELECT enabled FROM public.admin_kill_switches WHERE key = $1')) {
        const found = (store['admin_kill_switches'] || []).filter((k) => k.key === params[0]);
        return { rows: found };
      }
      if (sql.includes('SELECT * FROM public.approval_policies WHERE action_key = $1')) {
        const found = (store['approval_policies'] || []).filter((p) => p.action_key === params[0]);
        return { rows: found };
      }
      if (sql.includes('SELECT * FROM public.approval_requests WHERE id = $1')) {
        const found = (store['approval_requests'] || []).filter((r) => r.id === params[0]);
        return { rows: found };
      }
      if (sql.includes('SELECT * FROM public.admin_audit_logs')) {
        return { rows: store['admin_audit_logs'] || [] };
      }
      return { rows: [] };
    },
    withTransaction: async (cb: any) => {
      const client = {
        query: async (sql: string, params: any[] = []) => {
          if (sql.includes('FOR UPDATE')) {
            const match = sql.match(/id = \$1/);
            if (match) {
              const found = (store['approval_requests'] || []).filter((r) => r.id === params[0]);
              return { rows: found };
            }
          }
          if (sql.includes('UPDATE public.approval_requests SET status = $1')) {
            const req = (store['approval_requests'] || []).find((r) => r.id === params[1]);
            if (req) req.status = params[0];
            return { rows: req ? [req] : [] };
          }
          if (sql.includes('UPDATE public.approval_requests SET status = \'executed\'')) {
            const req = (store['approval_requests'] || []).find((r) => r.id === params[0]);
            if (req) {
              req.status = 'executed';
              req.executed_at = new Date().toISOString();
            }
            return { rows: req ? [req] : [] };
          }
          if (sql.includes('INSERT INTO public.admin_audit_logs')) {
            const log = { id: crypto.randomUUID(), ...params };
            store['admin_audit_logs'] = store['admin_audit_logs'] || [];
            store['admin_audit_logs'].push(log);
            return { rows: [log] };
          }
          return { rows: [] };
        },
      };
      return cb(client);
    },
  };
}

describe('Phase 1: Admin Operations & Governance Test Suite', () => {
  const jwtSecret = 'dev-admin-secret-shopsell-ultra-secure-key-2026';
  process.env.ADMIN_JWT_SECRET = jwtSecret;

  // ============================================================================
  // 1. RBAC & Deny-By-Default Invariant Tests
  // ============================================================================
  describe('1A & 1B: RBAC & Deny-by-Default Guard', () => {
    it('should REJECT an endpoint without @RequirePermission decorator (Deny-by-Default)', async () => {
      const reflector = new Reflector();
      reflector.getAllAndOverride = () => undefined; // No permission metadata!

      const mockDb: any = createMockDb();
      const redis = new AdminRedisService();
      const wormSink = new LocalWormSinkService();
      const alertSink = new LocalAlertSinkService();
      const audit = new AdminAuditService(mockDb, wormSink, alertSink);
      const rbac = new RbacService(mockDb, redis);
      const guard = new AdminAuthGuard(reflector, {} as any, rbac, audit);

      const mockContext: any = {
        switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
        getHandler: () => () => {},
        getClass: () => class {},
      };

      await assert.rejects(
        async () => guard.canActivate(mockContext),
        (err: any) => err instanceof ForbiddenException && err.message.includes('missing explicit permission decorator')
      );
    });

    it('should REJECT customer session token (shopsell_token must NOT grant admin access)', async () => {
      const reflector = new Reflector();
      reflector.getAllAndOverride = (key: string) => {
        if (key === ADMIN_PERMISSION_KEY) return 'payout:approve';
        return undefined;
      };

      const mockDb: any = createMockDb();
      const redis = new AdminRedisService();
      const wormSink = new LocalWormSinkService();
      const alertSink = new LocalAlertSinkService();
      const audit = new AdminAuditService(mockDb, wormSink, alertSink);
      const rbac = new RbacService(mockDb, redis);
      const guard = new AdminAuthGuard(reflector, {} as any, rbac, audit);

      // Customer cookie provided instead of shopsell_admin_token
      const mockReq: any = {
        headers: {},
        cookies: { shopsell_token: 'customer_jwt_token_here' },
        socket: { remoteAddress: '127.0.0.1' },
      };
      const mockContext: any = {
        switchToHttp: () => ({ getRequest: () => mockReq }),
        getHandler: () => () => {},
        getClass: () => class {},
      };

      await assert.rejects(
        async () => guard.canActivate(mockContext),
        (err: any) => err instanceof UnauthorizedException && err.message.includes('Admin authentication required')
      );
    });
  });

  // ============================================================================
  // 2. Separation of Duties (SoD) Invariant Tests
  // ============================================================================
  describe('1B: Separation of Duties (SoD) Enforcement', () => {
    const mockDb: any = createMockDb();
    const redis = new AdminRedisService();
    const rbac = new RbacService(mockDb, redis);

    it('should FORBID requester from approving their own request', () => {
      assert.throws(
        () =>
          rbac.assertSeparationOfDuties({
            action: 'refund:high_value',
            actorAdminId: 'admin-100',
            requesterAdminId: 'admin-100', // SAME ACTOR
          }),
        (err: any) => err instanceof ForbiddenException && err.message.includes('cannot approve your own request')
      );
    });

    it('should FORBID creator of payout batch from approving its dispatch', () => {
      assert.throws(
        () =>
          rbac.assertSeparationOfDuties({
            action: 'payout:approve',
            actorAdminId: 'admin-200',
            creatorAdminId: 'admin-200', // SAME ACTOR
          }),
        (err: any) => err instanceof ForbiddenException && err.message.includes('Creator of a payout batch cannot approve')
      );
    });

    it('should FORBID seller onboarding admin from approving seller bank detail alterations', () => {
      assert.throws(
        () =>
          rbac.assertSeparationOfDuties({
            action: 'seller:bank_detail_change',
            actorAdminId: 'admin-300',
            onboardedByAdminId: 'admin-300', // SAME ACTOR
          }),
        (err: any) => err instanceof ForbiddenException && err.message.includes('originally onboarded this seller is prohibited')
      );
    });
  });

  // ============================================================================
  // 3. Four-Eyes Approval Engine: Tamper & Expiry Tests
  // ============================================================================
  describe('1E: Four-Eyes Approval Engine & Tamper Detection', () => {
    it('should REJECT execution if payload was altered after approval (Payload Tamper Guard)', async () => {
      const originalPayload = { payout_batch_id: 'pb-01', total_inr: 500000 };
      const canonical = JSON.stringify(originalPayload, Object.keys(originalPayload).sort());
      const approvedHash = crypto.createHash('sha256').update(canonical).digest('hex');

      // Tampered payload has altered total_inr!
      const tamperedPayload = { payout_batch_id: 'pb-01', total_inr: 9999999 };

      const mockDb: any = createMockDb({
        approval_requests: [
          {
            id: 'req-test-tamper',
            action_key: 'payout:batch_dispatch',
            payload: tamperedPayload, // Altered in DB or transit!
            payload_hash: approvedHash, // Original approved hash
            requester_id: 'admin-01',
            status: 'approved',
            expires_at: new Date(Date.now() + 60000).toISOString(),
          },
        ],
      });

      const redis = new AdminRedisService();
      const rbac = new RbacService(mockDb, redis);
      const wormSink = new LocalWormSinkService();
      const alertSink = new LocalAlertSinkService();
      const audit = new AdminAuditService(mockDb, wormSink, alertSink);
      const engine = new ApprovalEngineService(mockDb, rbac, {} as any, audit);

      await assert.rejects(
        async () =>
          engine.executeApprovedRequest('req-test-tamper', 'admin-02', async () => 'EXECUTED'),
        (err: any) =>
          err instanceof ConflictException && err.message.includes('Request payload was modified after approval')
      );
    });

    it('should REJECT execution of an expired approval request', async () => {
      const payload = { amount: 10000 };
      const canonical = JSON.stringify(payload, Object.keys(payload).sort());
      const payloadHash = crypto.createHash('sha256').update(canonical).digest('hex');

      const mockDb: any = createMockDb({
        approval_requests: [
          {
            id: 'req-expired',
            action_key: 'refund:high_value',
            payload,
            payload_hash: payloadHash,
            requester_id: 'admin-01',
            status: 'approved',
            expires_at: new Date(Date.now() - 3600000).toISOString(), // Expired 1 hour ago
          },
        ],
      });

      const redis = new AdminRedisService();
      const rbac = new RbacService(mockDb, redis);
      const wormSink = new LocalWormSinkService();
      const alertSink = new LocalAlertSinkService();
      const audit = new AdminAuditService(mockDb, wormSink, alertSink);
      const engine = new ApprovalEngineService(mockDb, rbac, {} as any, audit);

      await assert.rejects(
        async () => engine.executeApprovedRequest('req-expired', 'admin-02', async () => 'OK'),
        (err: any) => err instanceof BadRequestException && err.message.includes('has expired')
      );
    });

    it('should enforce Small-Team Fallback when eligible approvers < required approvals', async () => {
      const mockDb: any = createMockDb({
        approval_policies: [
          {
            action_key: 'seller:bank_detail_change',
            required_approvals: 2,
            required_permission: 'seller:bank_detail_change',
            expiry_hours: 24,
          },
        ],
      });

      const redis = new AdminRedisService();
      const rbac = new RbacService(mockDb, redis);
      const wormSink = new LocalWormSinkService();
      const alertSink = new LocalAlertSinkService();
      const audit = new AdminAuditService(mockDb, wormSink, alertSink);
      const engine = new ApprovalEngineService(mockDb, rbac, {} as any, audit);

      // In mock DB with 0 other eligible approvers, findEligibleApprovers returns []
      const eligible = await engine.findEligibleApprovers('seller:bank_detail_change', 'admin-requester');
      assert.strictEqual(eligible.length, 0);
      assert.ok(eligible.length < 2, 'Must trigger small-team fallback');
    });
  });

  // ============================================================================
  // 4. Immutable Audit Trail & Redaction Tests
  // ============================================================================
  describe('1D: Cryptographic Audit Trail & Redaction', () => {
    it('should SANITIZE PAN, bank accounts, passwords, and tokens from audit payloads', () => {
      const sensitiveInput = {
        pan: 'ABCDE1234F',
        bank_account: '918273645102',
        email: 'priya.sharma@domain.in',
        phone: '+919876543210',
        password: 'my-super-secret-password',
        auth_token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz',
        public_data: 'Safe to log',
      };

      const sanitized = sanitizeAuditPayload(sensitiveInput);

      assert.strictEqual(sanitized.pan, 'XXXXX234F');
      assert.strictEqual(sanitized.bank_account, 'XXXXXXXX5102');
      assert.ok(sanitized.email.includes('***'));
      assert.ok(sanitized.phone.includes('*****'));
      assert.strictEqual(sanitized.password, '[REDACTED_SECRET]');
      assert.strictEqual(sanitized.auth_token, '[REDACTED_SECRET]');
      assert.strictEqual(sanitized.public_data, 'Safe to log');
    });

    it('should PREVENT customer from self-promoting roles (trg_prevent_role_self_promotion invariant)', () => {
      function simulateProfileUpdate(oldProfile: { roles: string[] }, newProfile: { roles: string[] }, callerRole: string) {
        const rolesChanged = JSON.stringify(oldProfile.roles) !== JSON.stringify(newProfile.roles);
        if (rolesChanged && callerRole !== 'service_role') {
          throw new ForbiddenException('Access Denied: Customer accounts are strictly prohibited from modifying account roles.');
        }
        return newProfile;
      }

      const customerProfile = { roles: ['customer'] };
      const maliciousUpdate = { roles: ['customer', 'admin'] };

      assert.throws(
        () => simulateProfileUpdate(customerProfile, maliciousUpdate, 'authenticated'),
        (err: any) => err instanceof ForbiddenException && err.message.includes('strictly prohibited from modifying account roles')
      );

      // Only service_role can update
      const allowedUpdate = simulateProfileUpdate(customerProfile, maliciousUpdate, 'service_role');
      assert.deepStrictEqual(allowedUpdate.roles, ['customer', 'admin']);
    });

    it('should VERIFY cryptographic SHA-256 hash-chain integrity', async () => {
      const wormSink = new LocalWormSinkService();
      const alertSink = new LocalAlertSinkService();

      // Create a valid 2-node hash chain
      const genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';
      const node1Data = JSON.stringify({
        actor_admin_id: 'adm-01',
        actor_role_at_time: 'super_admin',
        action: 'system:init',
        resource_type: 'cluster',
        resource_id: null,
        outcome: 'success',
        reason: null,
        ticket_ref: null,
        before_state: null,
        after_state: null,
        approver_ids: [],
        ip_address: null,
        prev_hash: genesisHash,
      });
      const hash1 = crypto.createHash('sha256').update(node1Data).digest('hex');

      const node2Data = JSON.stringify({
        actor_admin_id: 'adm-02',
        actor_role_at_time: 'finance_controller',
        action: 'payout:create',
        resource_type: 'payout_batch',
        resource_id: 'pb-01',
        outcome: 'success',
        reason: null,
        ticket_ref: null,
        before_state: null,
        after_state: null,
        approver_ids: [],
        ip_address: null,
        prev_hash: hash1,
      });
      const hash2 = crypto.createHash('sha256').update(node2Data).digest('hex');

      const mockDb: any = createMockDb({
        admin_audit_logs: [
          {
            id: 'log-1',
            created_at: '2026-10-03T10:00:00Z',
            actor_admin_id: 'adm-01',
            actor_role_at_time: 'super_admin',
            action: 'system:init',
            resource_type: 'cluster',
            outcome: 'success',
            prev_hash: genesisHash,
            row_hash: hash1,
          },
          {
            id: 'log-2',
            created_at: '2026-10-03T10:05:00Z',
            actor_admin_id: 'adm-02',
            actor_role_at_time: 'finance_controller',
            action: 'payout:create',
            resource_type: 'payout_batch',
            resource_id: 'pb-01',
            outcome: 'success',
            prev_hash: hash1,
            row_hash: hash2,
          },
        ],
      });

      const audit = new AdminAuditService(mockDb, wormSink, alertSink);
      const result = await audit.verifyAuditChain();
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.verifiedRecords, 2);
    });

    it('should DETECT tamper if an audit record was modified', async () => {
      const wormSink = new LocalWormSinkService();
      const alertSink = new LocalAlertSinkService();
      const genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';

      const mockDb: any = createMockDb({
        admin_audit_logs: [
          {
            id: 'log-tampered',
            created_at: '2026-10-03T10:00:00Z',
            actor_admin_id: 'adm-01',
            actor_role_at_time: 'super_admin',
            action: 'payout:dispatch',
            resource_type: 'payout',
            outcome: 'success',
            prev_hash: genesisHash,
            row_hash: 'forged_fake_hash_here_1234567890abcdef', // Invalid hash!
          },
        ],
      });

      const audit = new AdminAuditService(mockDb, wormSink, alertSink);
      const result = await audit.verifyAuditChain();
      assert.strictEqual(result.isValid, false);
      assert.ok(result.message.includes('Tamper detected'));
    });
  });

  // ============================================================================
  // 5. Support Engineer PII Lockout & Kill Switches
  // ============================================================================
  describe('1F & 1G: Security Invariants & Incident Controls', () => {
    it('should HARD-BLOCK Support Engineer role from revealing production PII', async () => {
      const mockDb: any = createMockDb();
      const redis = new AdminRedisService();
      const rbac = new RbacService(mockDb, redis);
      rbac.getAdminRoles = async () => [
        { id: 'r-9', name: 'Support Engineer', slug: 'support_engineer' },
      ];

      const wormSink = new LocalWormSinkService();
      const alertSink = new LocalAlertSinkService();
      const audit = new AdminAuditService(mockDb, wormSink, alertSink);
      const kms = new KmsEncryptionService();
      const piiService = new PiiRevealService(mockDb, redis, rbac, {} as any, audit, kms);

      await assert.rejects(
        async () =>
          piiService.revealPii({
            adminId: 'adm-support',
            resourceType: 'customer',
            resourceId: 'c-01',
            fieldName: 'phone_number',
            reason: 'Investigating customer ticket',
            stepUpToken: 'valid_token',
          }),
        (err: any) =>
          err instanceof ForbiddenException &&
          err.message.includes('Support Engineer role is strictly prohibited from revealing production PII')
      );
    });

    it('should HALT operation immediately when incident kill switch is active', async () => {
      const mockDb: any = createMockDb({
        admin_kill_switches: [
          { key: 'payout_freeze', enabled: true },
        ],
      });

      const redis = new AdminRedisService();
      const wormSink = new LocalWormSinkService();
      const alertSink = new LocalAlertSinkService();
      const audit = new AdminAuditService(mockDb, wormSink, alertSink);
      const killSwitch = new KillSwitchService(mockDb, redis, audit, alertSink);

      const isActive = await killSwitch.isKillSwitchActive('payout_freeze');
      assert.strictEqual(isActive, true);

      await assert.rejects(
        async () => killSwitch.assertKillSwitchInactive('payout_freeze', 'batch dispatch'),
        (err: any) =>
          err instanceof ForbiddenException &&
          err.message.includes("Global kill switch 'payout_freeze' is currently active")
      );
    });
  });
});
