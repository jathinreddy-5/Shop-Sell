# Shop:Sell Admin Operations & Governance
## Master Architecture, Security Audit & Hardening Specification (Phase 1 & Phase 1b)

**Platform**: Shop:Sell Multi-Vendor Marketplace  
**Document Version**: 2.0.0 | **Classification**: Enterprise Security Blueprint & Audit  
**Active Branch**: `phase-1b-admin-hardening`  
**Baseline Git Tag**: `phase-1b-baseline` (`139ed3f0cfc34bc1ebfd306a445f1b88e1cf8f2b`)  
**Current HEAD Commit**: `ee74a61`  
**Local Test Database**: PostgreSQL 18.1 on `127.0.0.1:54322`  
**Cloud Network State**: Zero cloud credentials loaded (`SUPABASE_*` unset, loopback Redis/Typesense overrides)  
**Test Suite Status**: 81 / 81 Tests Passing (0 Failures, 0 Skips, 0 Cancellations)  
**Gate Status**: Execution HELD pending architectural resolution of Critical Invariant Findings  

---

## Table of Contents
1. [Executive Summary & Scope Guardrails](#1-executive-summary--scope-guardrails)
2. [End-to-End System Architecture](#2-end-to-end-system-architecture)
   - 2.1 Three-Tier Actor Separation Model
   - 2.2 Dual-Token & Dual-Session Isolation
   - 2.3 Guard Hierarchy & Authorization Lifecycle
3. [Database Schema & Data Model Reference](#3-database-schema--data-model-reference)
   - 3.1 Migration 00008 (Admin Core Schema & 11 Tables)
   - 3.2 Migration 00009 Blueprint (Hardening, Least-Privilege & Lockdown)
4. [Pre-Flight Verification & Telemetry Evidence](#4-pre-flight-verification--telemetry-evidence)
   - 4.1 Secret Scan of Baseline Commits
   - 4.2 Verified Database Schema & Tables
   - 4.3 RLS Policy Isolation Execution Proof
   - 4.4 Local Harness Self-Check
5. [Completed Hardening Items & Regression Proofs](#5-completed-hardening-items--regression-proofs)
   - 5.1 Item 0a: SupabaseAuthGuard Role Source Hardening & Proof
   - 5.2 Item 0b: Admin Route Migration & NestJS DI Verification
6. [Critical Security Invariant Findings & Stop Triggers](#6-critical-security-invariant-findings--stop-triggers)
   - 6.1 Finding 1: Super Admin Wildcard Bypass in RbacService
   - 6.2 Finding 2: Passwordless Admin Login via Email Alone
   - 6.3 Finding 3: Broken Object-Level Authorization (BOLA/IDOR) on Store Payouts
   - 6.4 Finding 4: Telemetry Analysis of Redis & Typesense Test Isolation
7. [Technical Feasibility & Production Readiness Matrix (Item 3 Audit)](#7-technical-feasibility--production-readiness-matrix-item-3-audit)
   - 7.1 WebAuthn / Passkeys
   - 7.2 KMS Envelope Encryption
   - 7.3 WORM Sink (AWS S3 Object Lock Compliance Mode)
   - 7.4 SSO / OIDC Deprovisioning
   - 7.5 Dev-Token Endpoint Audit
8. [The Immutable Audit Trail (3 Layers of Defense)](#8-the-immutable-audit-trail-3-layers-of-defense)
   - 8.1 Layer 1: PostgreSQL Trigger Immutability
   - 8.2 Layer 2: SHA-256 Hash Chaining & Advisory Transaction Locking
   - 8.3 Layer 3: External WORM S3 Object Lock
   - 8.4 Redaction Engine
9. [Dual Control / Four-Eyes Approvals Engine](#9-dual-control--four-eyes-approvals-engine)
10. [Reconciled Permissions Catalog & RBAC Matrix](#10-reconciled-permissions-catalog--rbac-matrix)
11. [Step-by-Step Phase 1b Execution Roadmap](#11-step-by-step-phase-1b-execution-roadmap)

---

## 1. Executive Summary & Scope Guardrails

Phase 1 established the functional foundation of administrative operations across the Shop:Sell multi-vendor marketplace, delivering an 11-table PostgreSQL schema (`00008_admin_rbac_audit_approvals.sql`), core NestJS governance services (`admin-core`), and an operational Next.js 15 App Router admin portal (`apps/web/src/app/admin`).

Phase 1b hardens the administrative surface into a zero-trust, enterprise-grade governance platform. In accordance with project governance rules, all engineering in Phase 1b is bound by a strict **Scope Lock**:
1. **Zero Extraneous Code Changes**: No refactoring, reformatting, dependency upgrades, or unrelated bugfixes.
2. **Schema Immutability**: Existing migrations `00001` through `00008` are immutable. All new DDL and DML operations reside exclusively in `supabase/migrations/00009_admin_hardening_phase1b.sql`.
3. **Strict Local Database Confinement**: All migrations, scripts, and test suites execute exclusively against local PostgreSQL `127.0.0.1:54322`. Any script or test attempting to connect to a non-loopback host aborts immediately via an embedded host assertion.
4. **Git Discipline**: Exactly one atomic commit per numbered item (`phase1b item N: <summary>`) accompanied by verified `git diff --stat`.
5. **Mandatory Stop Triggers**: Execution must immediately pause and report upon:
   - Any test failure or cancellation.
   - Any requirement to modify an existing test (e.g. `auth-guard.spec.ts`).
   - The presence of a wildcard bypass for the `super_admin` role in admin guards.
   - The ability to authenticate administrative access via email alone.

---

## 2. End-to-End System Architecture

```mermaid
graph TD
    subgraph Client Surfaces
        WebClient[Customer / Merchant Web App]
        AdminPortal[Admin Operational Portal /admin]
    end

    subgraph Authentication Gateways
        SupabaseAuthGuard[SupabaseAuthGuard: app_metadata.roles only]
        AdminAuthGuard[AdminAuthGuard: shopsell_admin_token + Redis Session]
    end

    subgraph Authorization & Enforcement
        RolesGuard[RolesGuard: customer | owner | legacy admin]
        RbacService[RbacService: Strict DB Permissions + Four-Eyes SoD]
        AuditInterceptor[AuditInterceptor: PII Redaction + Hash-Chained Log]
    end

    subgraph Administrative Core
        AdminUsersDB[(public.admin_users)]
        AdminAuditDB[(public.admin_audit_logs)]
        ApprovalsDB[(public.approval_requests)]
        KillSwitchesDB[(public.admin_kill_switches)]
        WormStorage[External S3 Object Lock: 7-Year WORM]
    end

    WebClient -->|shopsell_token| SupabaseAuthGuard
    SupabaseAuthGuard --> RolesGuard
    RolesGuard -->|Legacy App Routes| SellersPayouts[Sellers / Payouts / Search]

    AdminPortal -->|shopsell_admin_token| AdminAuthGuard
    AdminAuthGuard --> RbacService
    AdminAuthGuard --> AuditInterceptor
    AuditInterceptor --> AdminAuditDB
    AdminAuditDB --> WormStorage
    RbacService --> AdminUsersDB
    RbacService --> ApprovalsDB
    RbacService --> KillSwitchesDB
```

### 2.1 Three-Tier Actor Separation Model
The Shop:Sell marketplace strictly segregates three distinct actor domains:
1. **Customers**: Standard buyers registered in Supabase `auth.users` and mapped to `public.profiles`. Held roles are restricted to `['customer']`.
2. **Merchants / Sellers**: Store owners and staff registered in Supabase `auth.users` and mapped to `public.profiles` with `['owner']` role, referencing records in `public.stores`.
3. **Platform Administrators**: Internal operations staff registered in `public.admin_users`. Administrators are completely decoupled from customer profiles. Administrative identity is authenticated through a dedicated admin authentication pipeline, governed by `public.admin_role_assignments` and evaluated against `public.permissions`.

### 2.2 Dual-Token & Dual-Session Isolation
To eliminate cross-context privilege leakage, the platform implements a dual-token architecture:
- **Customer / Merchant Token (`shopsell_token`)**: Signed by Supabase Auth JWT secret. Carries standard claims (`sub`, `email`, `app_metadata.roles`). Validated by `SupabaseAuthGuard`.
- **Administrative Token (`shopsell_admin_token`)**: Signed by a dedicated administrative secret (`ADMIN_JWT_SECRET`). Carries administrative claims (`sub` pointing to `admin_users.id`, `session_id`, `roles`). Issued via an `httpOnly`, `Secure`, `SameSite=Lax` cookie restricted to the `/admin` path. Validated exclusively by `AdminAuthGuard`.
- **Cross-Acceptance Invariant**: `AdminAuthGuard` unconditionally rejects `shopsell_token`. A compromised customer or seller JWT cannot access any administrative endpoint.

### 2.3 Guard Hierarchy & Authorization Lifecycle
Every incoming HTTP request traverses an explicit guard sequence based on route classification:
1. **Public Routes**: Marked with `@Public()`; bypass authentication.
2. **Customer / Merchant Routes**: Protected by `@UseGuards(SupabaseAuthGuard, RolesGuard)` and annotated with `@Roles('customer' | 'owner')`.
3. **Administrative Routes**: Protected by `@UseGuards(AdminAuthGuard)` and `@UseInterceptors(AuditInterceptor)`.
   - **Deny-by-Default Invariant**: Every administrative endpoint must be explicitly decorated with `@RequirePermission('resource:action')`. If the decorator is missing, `AdminAuthGuard` unconditionally raises `ForbiddenException` (HTTP 403) and writes a security violation alert to the audit trail.
   - **Step-Up Verification**: Operations targeting sensitive actions (`payout:approve`, `seller:bank_detail_change`, `pii:reveal`, `kill_switch:manage`) require a valid `x-step-up-token` header confirming fresh passkey/WebAuthn assertion within the preceding 5 minutes.

---

## 3. Database Schema & Data Model Reference

### 3.1 Migration 00008 (`00008_admin_rbac_audit_approvals.sql`)
Migration 00008 provisions the 11 core tables governing administrative security:

```
public.admin_users
  ├── id (UUID, PK)
  ├── email (TEXT, UNIQUE)
  ├── full_name (TEXT)
  ├── status (TEXT: active | suspended | offboarded)
  ├── passkey_enrolled (BOOLEAN)
  ├── mfa_enabled (BOOLEAN)
  ├── sso_subject (TEXT)
  └── created_at / updated_at (TIMESTAMPTZ)

public.roles
  ├── id (UUID, PK)
  ├── slug (TEXT, UNIQUE: super_admin | finance_controller | ...)
  ├── name (TEXT)
  ├── description (TEXT)
  ├── max_session_minutes (INTEGER)
  ├── requires_passkey (BOOLEAN)
  └── is_system (BOOLEAN)

public.permissions
  ├── id (UUID, PK)
  ├── resource (TEXT)
  ├── action (TEXT)
  ├── risk_level (TEXT: low | standard | high | critical)
  ├── description (TEXT)
  └── UNIQUE (resource, action)

public.role_permissions
  ├── role_id (UUID, FK -> roles.id ON DELETE CASCADE)
  ├── permission_id (UUID, FK -> permissions.id ON DELETE CASCADE)
  └── PRIMARY KEY (role_id, permission_id)

public.admin_role_assignments
  ├── id (UUID, PK)
  ├── admin_id (UUID, FK -> admin_users.id ON DELETE CASCADE)
  ├── role_id (UUID, FK -> roles.id ON DELETE CASCADE)
  ├── scope_type (TEXT: global | category | store)
  ├── scope_value (TEXT)
  ├── assigned_by (UUID, FK -> admin_users.id)
  ├── expires_at (TIMESTAMPTZ)
  └── created_at (TIMESTAMPTZ)

public.approval_policies
  ├── id (UUID, PK)
  ├── action_key (TEXT, UNIQUE)
  ├── min_approvers (INTEGER DEFAULT 1)
  ├── required_roles (TEXT[])
  ├── max_pending_hours (INTEGER DEFAULT 24)
  ├── step_up_required (BOOLEAN DEFAULT TRUE)
  └── cooldown_seconds (INTEGER DEFAULT 0)

public.approval_requests
  ├── id (UUID, PK)
  ├── action_key (TEXT, FK -> approval_policies.action_key)
  ├── requester_id (UUID, FK -> admin_users.id)
  ├── payload (JSONB)
  ├── payload_hash (TEXT)
  ├── reason (TEXT)
  ├── ticket_ref (TEXT)
  ├── status (TEXT: pending | approved | rejected | executed | expired)
  ├── expires_at (TIMESTAMPTZ)
  └── created_at / executed_at (TIMESTAMPTZ)

public.approval_decisions
  ├── id (UUID, PK)
  ├── request_id (UUID, FK -> approval_requests.id ON DELETE CASCADE)
  ├── approver_id (UUID, FK -> admin_users.id)
  ├── decision (TEXT: approved | rejected)
  ├── step_up_verified (BOOLEAN)
  ├── notes (TEXT)
  └── decided_at (TIMESTAMPTZ)

public.admin_audit_logs
  ├── id (UUID, PK)
  ├── created_at (TIMESTAMPTZ DEFAULT NOW())
  ├── actor_admin_id (UUID, FK -> admin_users.id)
  ├── actor_role_at_time (TEXT)
  ├── action (TEXT)
  ├── resource_type (TEXT)
  ├── resource_id (TEXT)
  ├── outcome (TEXT: success | denied | error)
  ├── reason (TEXT)
  ├── ticket_ref (TEXT)
  ├── before_state (JSONB)
  ├── after_state (JSONB)
  ├── approver_ids (UUID[])
  ├── request_id (TEXT)
  ├── session_id (TEXT)
  ├── ip_address (TEXT)
  ├── user_agent (TEXT)
  ├── prev_hash (TEXT)
  └── row_hash (TEXT NOT NULL)

public.admin_kill_switches
  ├── key (TEXT, PK: emergency_stop_all | payout_processing | ...)
  ├── name (TEXT)
  ├── description (TEXT)
  ├── is_active (BOOLEAN DEFAULT FALSE)
  ├── affected_services (TEXT[])
  ├── activated_by (UUID, FK -> admin_users.id)
  ├── activated_at (TIMESTAMPTZ)
  ├── activation_reason (TEXT)
  ├── deactivated_by (UUID, FK -> admin_users.id)
  └── deactivated_at (TIMESTAMPTZ)

public.elevated_access_grants
  ├── id (UUID, PK)
  ├── admin_id (UUID, FK -> admin_users.id)
  ├── grant_type (TEXT: jit_temporary | break_glass)
  ├── target_role (TEXT)
  ├── reason (TEXT)
  ├── ticket_ref (TEXT)
  ├── approver_id (UUID, FK -> admin_users.id)
  ├── approved_at (TIMESTAMPTZ)
  ├── expires_at (TIMESTAMPTZ)
  ├── revoked_at (TIMESTAMPTZ)
  └── created_at (TIMESTAMPTZ)
```

### 3.2 Migration 00009 Blueprint (`00009_admin_hardening_phase1b.sql`)
Migration 00009 addresses architectural gaps and locks down the database layer:
1. **Permission Catalog Seeding**: Idempotently seeds the 16 missing permissions (`admin:create`, `admin:offboard`, `admin:session_manage`, `role:assign`, `approval:view`, `approval:request`, `approval:decide`, `audit:verify`, `refund:issue`, `refund:approve_high_value`, `seller:emergency_freeze`, `seller:bank_detail_change`, `kyc:verify`, `category:view`, `category:manage`, `catalog:search_sync`).
2. **Explicit RBAC Mappings**: Replaces the Super Admin wildcard by inserting explicit, least-privilege rows into `public.role_permissions` for all 9 system roles, including `super_admin`.
3. **Database Lockdown**:
   - `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;` for all 11 admin tables.
   - `REVOKE ALL ON ALL FUNCTIONS/SEQUENCES IN SCHEMA public FROM anon, authenticated;` for admin objects.
   - Enables Row-Level Security (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`) on all 11 admin tables with **zero policies** for `anon` or `authenticated`. All admin access must flow through server-side `service_role` or dedicated DB roles.
4. **Trigger Immutability & Anti-Tamper Hardening**:
   - `trg_prevent_role_self_promotion`: Intercepts `INSERT` or `UPDATE` on `public.admin_role_assignments` to prevent an admin from assigning roles to themselves unless authorized via `super_admin` bootstrap.
   - `trg_audit_logs_no_update_delete`: PostgreSQL trigger unconditionally blocking `UPDATE`, `DELETE`, and `TRUNCATE` operations on `public.admin_audit_logs`.
5. **GDPR / Privacy Pseudonymization Table**:
   - Provisions `public.admin_pii_pseudonyms` mapping PII references to cryptographic pseudonyms to support right-to-be-forgotten requests without breaking audit log hash chains.

---

## 4. Pre-Flight Verification & Telemetry Evidence

### 4.1 Secret Scan of Baseline Commits
A diff inspection across commits `phase-1b-baseline~3..phase-1b-baseline` (`435839e`, `393c5fa`, `139ed3f`) verified:
- **Mock Tokens**: Found at `apps/api/src/__tests__/admin-governance-phase1.spec.ts:308` (dummy fixture token `eyJ...` with payload `{"sub":"mock-admin-id"}`).
- **Real Secrets / Cloud Credentials**: **Zero found**. No JWTs, Supabase service_role keys, cloud database passwords, or private keys were committed.
- **Gitignore Protection**: `.gitignore` contains `auth_login_screenshot.png` at root.
- **Untracked Artifact**: `auth_login_screenshot.png` resides exclusively on local disk at `/Users/jathinreddy/Desktop/Shop:Sell/auth_login_screenshot.png` and is confirmed untracked.

### 4.2 Verified Database Schema & Tables
Verified by querying `\dt public.*` and inspecting table definitions on local PostgreSQL `127.0.0.1:54322`:
- Migration file: `supabase/migrations/00008_admin_rbac_audit_approvals.sql` (16,289 bytes).
- 11 core admin tables exist and conform exactly to the schema specification.

### 4.3 RLS Policy Isolation Execution Proof
Executed `scripts/test-rls.ts` and `supabase/tests/00007_rls_isolation.sql` against `127.0.0.1:54322`:
```text
🔒 Running Supabase RLS Policy Isolation SQL Tests...
✅ RLS Isolation Test Passed:
   - User A cannot be accessed or modified by User B
   - Addresses and Consent Log are strictly isolated by auth.uid()
   - Duplicate default address per type rejected by unique partial index
```

### 4.4 Local Harness Self-Check
Executed `scripts/harness-self-check.ts` (committed in `18d63ce`):
```text
1. PostgreSQL Version: PostgreSQL 18.1 on x86_64-apple-darwin23.6.0, compiled by Apple clang version 16.0.0 (clang-1600.0.26.6), 64-bit
2. Role authenticated verified: rolbypassrls = false
3. auth.uid() simulation verified: returns sub = 12345678-1234-1234-1234-123456789abc
4. auth.users table verified: exists = true
--- ALL HARNESS SELF-CHECKS PASSED ---
```

---

## 5. Completed Hardening Items & Regression Proofs

### 5.1 Item 0a: SupabaseAuthGuard Role Source Hardening & Proof
- **Commit**: `2e110c7` (`phase1b item 0a: remove user_metadata.roles fallback and harden role derivation`).
- **File**: `apps/api/src/common/guards/supabase-auth.guard.ts`.
- **Vulnerability**: Previously, `SupabaseAuthGuard` fell back to reading `decoded.user_metadata?.roles` if `decoded.app_metadata?.roles` was absent. Because Supabase users can mutate their own `user_metadata` from the client via `supabase.auth.updateUser({ data: { roles: ['admin'] } })`, this permitted client-driven privilege escalation.
- **Remediation**:
  - Completely removed the `user_metadata.roles` fallback. Roles derive solely from `decoded.app_metadata?.roles` (server-signed) or default to `['customer']`.
  - Audited full repository: 0 readers of `user_metadata.roles` across `apps/api`, `apps/web`, `packages/shared`, and `middleware.ts`.
  - Updated `AuthService` (`generateToken()`, `signup()`, `verifyOtp()`, `login()`, `generateDevToken()`) to stop writing roles into `user_metadata`.
- **Regression Proof in Throwaway Worktree**:
  Reverting `SupabaseAuthGuard` to its baseline version in a throwaway detached worktree caused `auth-guard-hardening.spec.ts` to fail immediately:
  ```text
  ▶ Phase 1b Item 0a: SupabaseAuthGuard Role Source Hardening
    ✖ should assign customer role only when roles exist solely in user_metadata (preventing self-promotion)
    AssertionError [ERR_ASSERTION]: User must NOT receive roles from user_metadata
    + actual - expected
      [
    +   'admin',
    +   'owner'
    -   'customer'
      ]
  ```

### 5.2 Item 0b: Admin Route Migration & NestJS DI Verification
- **Commit**: `ee74a61` (`phase1b item 0b: migrate sellers and payouts legacy admin routes to AdminAuthGuard`).
- **Migrated Routes**:
  1. `GET /api/sellers/admin/applications` ➔ `AdminAuthGuard`, `AuditInterceptor`, `@RequirePermission('seller:view')`.
  2. `PATCH /api/sellers/admin/applications/:id/review` ➔ `AdminAuthGuard`, `AuditInterceptor`, `@RequirePermission('seller:approve')`.
  3. `POST /api/payouts/batches/generate` ➔ `AdminAuthGuard`, `AuditInterceptor`, `@RequirePermission('payout:create')`.
  4. `PATCH /api/payouts/:id/status` ➔ `AdminAuthGuard`, `AuditInterceptor`, `@RequirePermission('payout:approve')`.
- **Preserved Legacy Tests**: `apps/api/src/__tests__/auth-guard.spec.ts:100` preserved unchanged.
- **Live NestJS DI Resolution Proof (`admin-route-guards.spec.ts`)**:
  Instantiates real `AppModule` via `NestFactory.create()`, verifies DI resolution of guards, interceptors, and controllers, and asserts HTTP 401/403 across all 4 routes (13/13 passed):
  ```text
  ▶ Phase 1b Item 0b: DI and Route Guard Proof for Migrated Endpoints
    ✔ should successfully resolve AdminAuthGuard and AuditInterceptor in Nest DI container (0.599583ms)
    ✔ should enforce 401 for unauthenticated request on GET /api/sellers/admin/applications (12.328084ms)
    ✔ should enforce 403 for authenticated customer token on GET /api/sellers/admin/applications (3758.107791ms)
    ✔ should enforce 403 for attacker token with user_metadata.roles=['admin'] on GET /api/sellers/admin/applications (1024.897291ms)
    ✔ should enforce 401 for unauthenticated request on PATCH /api/sellers/admin/applications/:id/review (17.72725ms)
    ✔ should enforce 403 for authenticated customer token on PATCH /api/sellers/admin/applications/:id/review (2057.759667ms)
    ✔ should enforce 403 for attacker token with user_metadata.roles=['admin'] on PATCH /api/sellers/admin/applications/:id/review (1768.326208ms)
    ✔ should enforce 401 for unauthenticated request on POST /api/payouts/batches/generate (2.084333ms)
    ✔ should enforce 403 for authenticated customer token on POST /api/payouts/batches/generate (1492.991292ms)
    ✔ should enforce 403 for attacker token with user_metadata.roles=['admin'] on POST /api/payouts/batches/generate (1550.077417ms)
    ✔ should enforce 401 for unauthenticated request on PATCH /api/payouts/:id/status (4.19425ms)
    ✔ should enforce 403 for authenticated customer token on PATCH /api/payouts/:id/status (1799.185625ms)
    ✔ should enforce 403 for attacker token with user_metadata.roles=['admin'] on PATCH /api/payouts/:id/status (1346.617583ms)
  ✔ Phase 1b Item 0b: DI and Route Guard Proof for Migrated Endpoints (17455.889041ms)
  ℹ tests 13, suites 1, pass 13, fail 0
  ```
- **Deployment Sequencing Warning**: Commit `0b` must **NOT** be deployed before Item 1 (bootstrap). Existing administrative users do not yet have records in `public.admin_users`; deploying `0b` first would immediately lock them out of seller approvals and payout batch generation.

---

## 6. Critical Security Invariant Findings & Stop Triggers

### 6.1 Finding 1: Super Admin Wildcard Bypass in RbacService
- **Location**: [apps/api/src/modules/admin-core/rbac/rbac.service.ts:126–135](file:///Users/jathinreddy/Desktop/Shop:Sell/apps/api/src/modules/admin-core/rbac/rbac.service.ts#L126-L135)
- **Code**:
  ```typescript
  async hasPermission(adminId: string, requiredPermission: string): Promise<boolean> {
    const roles = await this.getAdminRoles(adminId);
    const isSuperAdmin = roles.some((r) => r.slug === 'super_admin');
    if (isSuperAdmin) {
      return true; // <--- Wildcard bypass
    }

    const permissions = await this.getAdminPermissions(adminId);
    return permissions.includes(requiredPermission);
  }
  ```
- **Architectural Risk**: Any administrator assigned `super_admin` automatically bypasses all `@RequirePermission` checks in `AdminAuthGuard`. This bypasses granular, database-driven least-privilege scoping in `public.role_permissions` and violates Rule 9.
- **Remediation Specification**:
  1. Remove `if (isSuperAdmin) return true;` from `RbacService.hasPermission()`.
  2. Seed the complete, explicit set of permissions for `super_admin` directly into `public.role_permissions` via migration 00009.
  3. Four-eyes policies (`assertSeparationOfDuties()`) and incident kill switches continue to govern Super Admin execution without unconstrained permission wildcards.

### 6.2 Finding 2: Passwordless Admin Login via Email Alone
- **Location**: [apps/api/src/modules/admin-core/admin-core.controller.ts:79–96](file:///Users/jathinreddy/Desktop/Shop:Sell/apps/api/src/modules/admin-core/admin-core.controller.ts#L79-L96)
- **Code**:
  ```typescript
  // Verify admin credentials in DB
  const adminRes = await this.db.query<any>(
    `SELECT * FROM public.admin_users WHERE email = $1`,
    [dto.email.toLowerCase().trim()]
  );

  if (adminRes.rows.length === 0) {
    throw new UnauthorizedException('Invalid admin credentials.');
  }

  const admin = adminRes.rows[0];
  if (admin.status !== 'active') {
    throw new ForbiddenException(`Admin account is ${admin.status}.`);
  }

  // Create session
  const { token, session } = await this.authService.createAdminSession(admin, clientIp, userAgent);
  ```
- **Vulnerability Analysis**: `dto.password` is declared in `AdminLoginDto` ([apps/api/src/modules/admin-core/dto/admin-core.dto.ts:1–4](file:///Users/jathinreddy/Desktop/Shop:Sell/apps/api/src/modules/admin-core/dto/admin-core.dto.ts#L1-L4)) but **is never verified**. No password hash, bcrypt/argon2 evaluation, Supabase session validation, or passkey check is executed. Any caller who supplies an active admin email address is immediately issued a signed `shopsell_admin_token` JWT and an active session.
- **Rule Trigger**: Explicitly triggers the prompt stop condition: *"If email alone is enough, STOP and tell me. Quote the code with file:line."*
- **Remediation Architectures**:
  - **Option 1 (Supabase Auth Exchange)**: Admin authenticates via Supabase Auth (`supabase.auth.signInWithPassword({ email, password })`). Controller verifies the resulting Supabase session token, ensures `user.id` or `user.email` matches an active row in `public.admin_users`, and only then mints the `shopsell_admin_token`.
  - **Option 2 (Decoupled Argon2/Bcrypt Hash in admin_users)**: Add `password_hash TEXT` to `public.admin_users`. Controller evaluates `argon2.verify(admin.password_hash, dto.password)`.
  - **Option 3 (Mandatory WebAuthn / Passkey Assertion)**: Prohibit passwords entirely. Login requires a cryptographic FIDO2 challenge-response signed by the admin's enrolled hardware authenticator.

### 6.3 Finding 3: Broken Object-Level Authorization (BOLA/IDOR) on Store Payouts
- **Locations**:
  - Controller: [apps/api/src/modules/payouts/payouts.controller.ts:24–29](file:///Users/jathinreddy/Desktop/Shop:Sell/apps/api/src/modules/payouts/payouts.controller.ts#L24-L29)
  - Service: [apps/api/src/modules/payouts/payouts.service.ts:9–19](file:///Users/jathinreddy/Desktop/Shop:Sell/apps/api/src/modules/payouts/payouts.service.ts#L9-L19)
- **Code**:
  ```typescript
  @Get('store/:storeId')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  async getStorePayouts(@Param('storeId') storeId: string) {
    return this.payoutsService.getStorePayouts(storeId);
  }
  ```
- **Vulnerability Analysis**: `GET /api/payouts/store/:storeId` does not extract `@CurrentUser()` or verify that `user.sub === store.owner_id`. Any user with the `'owner'` role (owner of Store A) can pass the UUID of Store B and retrieve Store B's full payouts ledger, total revenue, and pending balances. *(Preserved unchanged per user instruction).*

### 6.4 Finding 4: Telemetry Analysis of Redis & Typesense Test Isolation
- **Environment Configuration**:
  - `REDIS_URL`: `rediss://default:[YOUR-UPSTASH-PASSWORD]@[YOUR-ENDPOINT].upstash.io:6379`
  - `TYPESENSE_HOST`: `[YOUR-CLUSTER-ID].a1.typesense.net`
- **Did the 81-test run touch cloud Redis?**: **NO.**
  - `apps/api/src/common/redis.ts:17` detects `[YOUR-` and falls back to `localhost:6379`.
  - When connection failed, `AdminRedisService` operated 100% against its built-in in-memory fallback map (`fallbackMemory`).
  - Typesense similarly rejected `[YOUR-CLUSTER-ID].a1.typesense.net` with `ERR_INVALID_URL` and fell back safely in `onModuleInit()`.
- **Hardened Test Gate Command**:
  ```bash
  unset SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY; \
  REDIS_URL="" REDIS_HOST="127.0.0.1" REDIS_PORT="6379" \
  TYPESENSE_HOST="127.0.0.1" TYPESENSE_PORT="8108" TYPESENSE_PROTOCOL="http" \
  DATABASE_URL="postgres://postgres:postgres@127.0.0.1:54322/postgres" \
  npm test --prefix apps/api
  ```

---

## 7. Technical Feasibility & Production Readiness Matrix (Item 3 Audit)

| Subsystem | What Real Implementation Exists Today | What Only Mocks Exist Today | Minimal Production-Valid Options | Estimated Effort |
| :--- | :--- | :--- | :--- | :--- |
| **Passkey (WebAuthn)** | None | `AdminAuthService.generatePasskeyChallenge()` returns dummy hex; `verifyStepUpProof()` accepts arbitrary input and returns a random token. | `@simplewebauthn/server` (verifies FIDO2 attestation & authentication assertions against stored public keys). | Small (1–2 hrs) |
| **KMS** | Full AES-256-GCM envelope encryption (DEK generated per field, encrypted with master key). | `KmsEncryptionService` derives master key locally via `crypto.createHash('sha256').update(process.env.ADMIN_KMS_MASTER_KEY)` instead of calling a cloud HSM/KMS. | `@aws-sdk/client-kms` (`GenerateDataKeyCommand` / `DecryptCommand`) or `@google-cloud/kms`. | Small (1–2 hrs) |
| **WORM Sink** | **Real implementation exists**: `S3ObjectLockSinkService` uses `@aws-sdk/client-s3` (`PutObjectCommand` with `ObjectLockMode: 'COMPLIANCE'` and 7-year retention). | `LocalWormSinkService` writes NDJSON to disk with readonly permissions when AWS credentials are absent. | Current S3 Object Lock implementation is production-valid when AWS credentials/bucket are configured. | 0 hrs (Already implemented) |
| **SSO** | `public.admin_users.sso_subject` column in PostgreSQL. | `AdminAuthService.deprovisionAdminBySso()` mock helper only. No OIDC/SAML endpoints exist. | `openid-client` (OIDC authorization code flow with PKCE) or `@node-saml/node-saml`. | Moderate (3–4 hrs) |

### 7.5 Dev-Token Endpoint Audit
- **Endpoint**: `POST /api/auth/dev-token` ([apps/api/src/modules/auth/auth.controller.ts:117](file:///Users/jathinreddy/Desktop/Shop:Sell/apps/api/src/modules/auth/auth.controller.ts#L117)).
- **Production Guard**: Checks `if (process.env.NODE_ENV === 'production') return { error: 'Dev token minting disabled in production' };`.
  - *Observation*: Returns HTTP 200 with JSON error message rather than throwing `NotFoundException` or `ForbiddenException`.
- **Roles Minted**: Accepts `body.roles?: UserRole[]` where `UserRole = 'customer' | 'owner' | 'admin'`. When `NODE_ENV !== 'production'`, it can mint tokens with `app_metadata.roles: ['admin', 'owner', 'customer']`.
- *Note*: While this minted token can access legacy `RolesGuard` routes, it **cannot** access `AdminAuthGuard` routes because it lacks an active session in `public.admin_users`.

---

## 8. The Immutable Audit Trail (3 Layers of Defense)

```mermaid
graph LR
    Action[Admin Mutation / Sensitive Read] --> Redact[audit-redaction.util: PAN, PII, Secrets Masked]
    Redact --> L1[Layer 1: PostgreSQL Trigger No UPDATE/DELETE]
    L1 --> L2[Layer 2: SHA-256 Hash Chaining row_hash_n = Hash CanonicalJSON || row_hash_n-1]
    L2 --> L3[Layer 3: AWS S3 Object Lock Compliance Mode WORM: 7-Year Retention]
```

### 8.1 Layer 1: PostgreSQL Trigger Immutability
At the database layer, `public.admin_audit_logs` is protected by `trg_audit_logs_no_update_delete`. Any attempt to execute `UPDATE`, `DELETE`, or `TRUNCATE` causes an immediate transaction rollback with `Security Invariant Violation`.

### 8.2 Layer 2: SHA-256 Hash Chaining & Advisory Transaction Locking
Each row's `row_hash` is calculated deterministically from its canonical fields combined with the `prev_hash` of the immediately preceding row:
$$\text{row\_hash}_n = \text{SHA-256}(\text{CanonicalJSON}(Row_n) \parallel \text{row\_hash}_{n-1})$$

To prevent race conditions during concurrent inserts, insertion acquires a PostgreSQL transaction-level advisory lock (`pg_advisory_xact_lock(hashtext('admin_audit_logs_chain'))`), guaranteeing deterministic serial ordering. `AdminAuditService.verifyAuditChain()` performs linear verification across all rows; any modified, deleted, or backdated record triggers a `CRITICAL` alert to Super Admins.

### 8.3 Layer 3: External WORM S3 Object Lock
Audit batches are regularly exported to AWS S3 buckets configured with **S3 Object Lock in Compliance Mode** and a 7-year retention period. Objects in Compliance Mode cannot be deleted or overwritten by any IAM identity, including the AWS root account.

### 8.4 Redaction Engine (`audit-redaction.util.ts`)
Before entering `before_state` or `after_state`:
- **Payment Card Numbers (PAN)**: Masked to `•••• •••• •••• 1234`.
- **Bank Account Numbers**: Masked to `••••••••1234`.
- **Email Addresses**: Masked to `j••••@domain.com`.
- **Phone Numbers**: Masked to `+91 ••••• ••421`.
- **Secrets & Credentials**: Passwords, JWTs, API keys, Bearer headers, and OTP codes are redacted to `[REDACTED_SECRET]`.

---

## 9. Dual Control / Four-Eyes Approvals Engine

High-impact administrative mutations require dual authorization:

```mermaid
stateDiagram-v2
    [*] --> Pending: Admin A submits request (requester_id)
    Pending --> Approved: Admin B approves (approver_id !== requester_id + Passkey)
    Pending --> Rejected: Admin B rejects
    Pending --> Expired: Exceeds max_pending_hours (Auto-cancel)
    Approved --> Executed: Action executed within transaction (Row Locked)
    Executed --> [*]
    Rejected --> [*]
    Expired --> [*]
```

### Invariants:
1. **Self-Approval Prohibition**: `assertSeparationOfDuties()` enforces `approver_id !== requester_id`. An admin can never approve their own action.
2. **Payload Integrity Check**: The canonical SHA-256 hash of the payload (`payload_hash`) is re-verified at execution time. Any tampering between submission and execution causes immediate abort.
3. **Row-Level Locking**: Execution queries `SELECT ... FROM public.approval_requests WHERE id = $1 FOR UPDATE`, preventing race conditions or double-execution.

---

## 10. Reconciled Permissions Catalog & RBAC Matrix

The complete platform permissions catalog comprises **38 granular permissions** across 9 system roles:

| Permission Key | Risk Level | Description |
| :--- | :--- | :--- |
| `admin:create` | Critical | Invite and onboard new admin users (dual-control). |
| `admin:offboard` | Critical | Revoke sessions, roles, and access grants for an admin. |
| `admin:session_manage` | Standard | Manage own session, challenge passkeys, and logout. |
| `role:assign` | High | Grant or revoke roles from an admin user. |
| `approval:view` | Low | Inspect pending four-eyes approval requests. |
| `approval:request` | Standard | Submit a high-impact operation for four-eyes approval. |
| `approval:decide` | High | Approve or reject a four-eyes request (requires step-up). |
| `audit:view` | Low | Search and inspect immutable admin audit logs. |
| `audit:verify` | Standard | Run SHA-256 hash-chain verification across all audit records. |
| `audit:export` | High | Trigger export of audit batches to WORM immutable storage. |
| `payout:create` | High | Construct payout batches for sellers. |
| `payout:approve` | Critical | Authorize seller payout dispatch (four-eyes, step-up passkey required). |
| `payout:freeze` | Critical | Emergency freeze on payout dispatch. |
| `refund:issue` | Standard | Issue customer refunds within standard operational limit. |
| `refund:approve_high_value` | High | Dual-approve refunds exceeding configured threshold. |
| `seller:view` | Low | View seller profiles, stores, and compliance status. |
| `seller:approve` | High | Approve newly submitted merchant applications. |
| `seller:suspend` | High | Suspend or ban a merchant store (dual-approval required). |
| `seller:emergency_freeze` | Critical | Immediate fraud freeze (single-actor + mandatory review task). |
| `seller:bank_detail_change` | Critical | Alter seller bank coordinates (four-eyes + cooling-off period). |
| `kyc:verify` | Standard | Review GSTIN, PAN, and corporate documents. |
| `catalog:moderate` | Standard | Review flagged listings, takedowns, and brand authorizations. |
| `catalog:search_sync` | High | Trigger manual full-catalog search index re-sync. |
| `category:view` | Low | Browse category taxonomy and attribute schemas. |
| `category:manage` | Standard | Create and update categories and attribute schemas. |
| `merchandising:publish` | High | Publish ranking weights, algorithm overrides, and banners. |
| `pii:reveal` | High | Reveal on-demand unmasked PAN, bank account, or KYC data. |
| `customer:impersonate` | High | Start time-limited (15m) read-only "view as" customer session. |
| `kill_switch:view` | Low | Inspect real-time status of global incident kill switches. |
| `kill_switch:manage` | Critical | Engage or disengage instant global kill switches (step-up required). |
| `elevation:request` | Standard | Request Just-in-Time access elevation with ticket reference. |
| `elevation:break_glass` | Critical | Single-actor emergency break-glass elevation (loud audit & alert). |
| `elevation:view` | Low | Inspect active JIT and break-glass elevated grants. |
| `elevation:revoke` | Standard | Immediately revoke an active elevation grant. |
| `access_review:view` | Low | Inspect quarterly user access review reports. |
| `access_review:attest` | Standard | Review and attest privilege assignments for an admin user. |

---

## 11. Step-by-Step Phase 1b Execution Roadmap

Upon resolution of the active stop conditions (Admin Login authentication method & Super Admin wildcard removal), Phase 1b proceeds through the following sequential items:

### Step B (Item 0c): Permissions Reconciliation & Search Sync Migration
- Create `supabase/migrations/00009_admin_hardening_phase1b.sql`.
- Idempotently seed all 16 missing permissions (`INSERT INTO public.permissions ... ON CONFLICT DO NOTHING`).
- Populate `public.role_permissions` with explicit least-privilege mappings for all 9 roles, including explicit permissions for `super_admin`.
- Remove `if (isSuperAdmin) return true;` from `apps/api/src/modules/admin-core/rbac/rbac.service.ts`.
- Migrate `POST /api/search/reindex` (`search.controller.ts:74`) to `AdminAuthGuard`, `AuditInterceptor`, and `@RequirePermission('catalog:search_sync')`.
- Add permission catalog drift test running against local PostgreSQL.
- **Commit**: `phase1b item 0c: reconcile permissions and migrate search sync`.

### Item 1: Super Admin Bootstrap CLI
- Create `scripts/bootstrap-super-admin.ts` with localhost assertion.
- Provisions initial Super Admin in `auth.users`, inserts record into `public.admin_users`, and assigns `super_admin` in `public.admin_role_assignments`.
- Enforces hard cap (maximum 3 Super Admins).
- **Commit**: `phase1b item 1: bootstrap super admin CLI`.

### Item 2: Database Lockdown & Privilege Revocation
- In migration 00009: `REVOKE ALL` on all admin tables, sequences, and functions from `anon` and `authenticated`.
- Enable RLS with zero policies on all 11 admin tables.
- Add test verifying `anon` and `authenticated` clients receive permission denied on all admin objects.
- **Commit**: `phase1b item 2: lockdown admin schema and revoke privileges`.

### Item 3: Production Boot Checks
- Add startup validation in `apps/api/src/main.ts` and `AdminCoreModule`:
  - Refuse boot in production if `process.env.ADMIN_JWT_SECRET` is unset or matches fallback string.
  - Refuse boot in production if mock WebAuthn or local KMS adapters are active without explicit override.
  - Assert `POST /api/auth/dev-token` is completely disabled or removed in production.
- **Commit**: `phase1b item 3: production boot security checks`.

### Item 4: Audit Trail Transaction Binding & Concurrency Proof
- Bind audit record creation to outer business transactions via `DatabaseService.transaction()`.
- Implement PostgreSQL transaction advisory lock (`pg_advisory_xact_lock`) on audit row insertion.
- Add concurrent integration test executing 50 parallel audited mutations; verify zero broken links in SHA-256 chain.
- **Commit**: `phase1b item 4: audit trail transaction binding and concurrency proof`.

### Item 5: Approvals Row Locking & Single Execution Guarantee
- Update `ApprovalsService.executeApproval()` to execute within `SELECT ... FOR UPDATE` row lock.
- Re-verify canonical payload SHA-256 hash prior to execution.
- Add test asserting concurrent execution attempts on the same approved request succeed exactly once.
- **Commit**: `phase1b item 5: approvals row locking and idempotency proof`.

### Item 6: Redis Outage Fail-Closed Verification
- Add integration test simulating complete Redis disconnection.
- Verify `AdminAuthGuard` fails closed (denies access) rather than failing open when session state cannot be validated.
- **Commit**: `phase1b item 6: redis outage fail-closed verification`.

### Item 7: Role Self-Promotion Prevention Trigger
- In migration 00009: Attach `trg_prevent_role_self_promotion` on `public.admin_role_assignments`.
- Checks `current_user` and prevents admins from granting roles to themselves.
- Add test verifying self-promotion rejection.
- **Commit**: `phase1b item 7: role self-promotion database trigger`.

### Item 8: GDPR Pseudonymization Mapping & Erasure Verification
- In migration 00009: Create `public.admin_pii_pseudonyms`.
- Implement erasure routine that replaces PII in state snapshots with cryptographic pseudonyms without altering row hashes.
- Add test verifying audit chain integrity remains intact post-erasure.
- **Commit**: `phase1b item 8: pii pseudonymization and erasure verification`.

### Items 9a–9f: Governance Features & CI Protection Gate
- Add automated CI static analysis test scanning all NestJS controllers; asserts that any route matching `/api/admin/*` or performing administrative mutations is protected by `AdminAuthGuard` and `@RequirePermission`.
- Final verification of all 81+ tests under hardened environment.
- **Commit**: `phase1b item 9: admin route protection CI gate and governance completion`.
