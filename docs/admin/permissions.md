# Shop:Sell Admin Permissions Catalog & Role-Based Access Control (RBAC) Matrix

## 1. Overview
The Shop:Sell Admin Operations and Governance system enforces a **strict deny-by-default** authorization model. Every admin API endpoint and operational interface requires an explicit granular permission decorator (`@RequirePermission('resource:action')`). Admin identities are completely decoupled from customer profiles (`public.admin_users` vs `public.profiles.roles`), and session cookies are strictly separated (`shopsell_admin_token` vs `shopsell_token`).

---

## 2. Granular Permissions Catalog

| Resource | Action | Risk Level | Description |
| :--- | :--- | :--- | :--- |
| **admin** | `create` | Critical | Invite and onboard new admin users (requires dual-approval). |
| **admin** | `offboard` | Critical | Immediately revoke sessions, roles, and access grants for an admin. |
| **admin** | `session_manage` | Standard | Manage own session, challenge passkeys, and logout. |
| **role** | `assign` | High | Grant or revoke roles from an admin user. |
| **approval** | `view` | Low | Inspect pending four-eyes approval requests and audit history. |
| **approval** | `request` | Standard | Submit a high-impact operation for four-eyes approval. |
| **approval** | `decide` | High | Approve or reject a four-eyes request (requires step-up). |
| **audit** | `view` | Low | Search and inspect immutable admin audit logs. |
| **audit** | `verify` | Standard | Run SHA-256 hash-chain verification across all audit records. |
| **audit** | `export` | High | Trigger export of audit batches to WORM immutable storage. |
| **payout** | `create` | High | Construct payout batches for sellers. |
| **payout** | `approve` | Critical | Authorize seller payout dispatch (four-eyes, step-up passkey required). |
| **refund** | `issue` | Standard | Issue customer refunds within standard operational limit. |
| **refund** | `approve_high_value` | High | Dual-approve refunds exceeding configured threshold. |
| **seller** | `view` | Low | View seller profiles, stores, and compliance status. |
| **seller** | `suspend` | High | Suspend or ban a merchant store (dual-approval required). |
| **seller** | `emergency_freeze` | Critical | Immediate fraud freeze (single-actor + mandatory review task). |
| **seller** | `bank_detail_change` | Critical | Alter seller bank coordinates (four-eyes + cooling-off period). |
| **kyc** | `verify` | Standard | Review GSTIN, PAN, and corporate documents. |
| **catalog** | `moderate` | Standard | Review flagged listings, takedowns, and brand authorizations. |
| **category** | `view` | Low | Browse category taxonomy and attribute schemas. |
| **category** | `manage` | Standard | Create and update categories and attribute schemas. |
| **merchandising**| `publish` | High | Publish ranking weights, algorithm overrides, and banners. |
| **pii** | `reveal` | High | Reveal on-demand unmasked PAN, bank account, or KYC data. |
| **customer** | `impersonate` | High | Start time-limited (15m) read-only "view as" customer session. |
| **kill_switch** | `view` | Low | Inspect real-time status of global incident kill switches. |
| **kill_switch** | `manage` | Critical | Engage or disengage instant global kill switches (step-up required). |
| **elevation** | `request` | Standard | Request Just-in-Time access elevation with ticket reference. |
| **elevation** | `break_glass` | Critical | Single-actor emergency break-glass elevation (loud audit & alert). |
| **elevation** | `view` | Low | Inspect active JIT and break-glass elevated grants. |
| **elevation** | `revoke` | Standard | Immediately revoke an active elevation grant. |
| **access_review** | `view` | Low | Inspect quarterly user access review reports. |
| **access_review** | `attest` | Standard | Review and attest privilege assignments for an admin user. |

---

## 3. Seed Roles & RBAC Matrix

The platform seeds 9 core operational roles.

| Permission | Super Admin | Finance Controller | Trust & Safety | Customer Support | Seller Ops | Catalog Manager | Merchandiser | Compliance Auditor | Support Engineer |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `admin:create` | **Yes** | No | No | No | No | No | No | No | No |
| `admin:offboard` | **Yes** | No | No | No | No | No | No | No | No |
| `admin:session_manage` | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** |
| `role:assign` | **Yes** | No | No | No | No | No | No | No | No |
| `approval:view` | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | No |
| `approval:request` | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | No | No |
| `approval:decide` | **Yes*** | **Yes** | **Yes** | No | **Yes** | **Yes** | **Yes** | No | No |
| `audit:view` | **Yes** | **Yes** | **Yes** | No | No | No | No | **Yes** | No |
| `audit:verify` | **Yes** | No | No | No | No | No | No | **Yes** | No |
| `audit:export` | **Yes** | **Yes** | No | No | No | No | No | **Yes** | No |
| `payout:create` | **Yes** | **Yes** | No | No | No | No | No | No | No |
| `payout:approve` | **Yes*** | **Yes** | No | No | No | No | No | No | No |
| `refund:issue` | **Yes** | **Yes** | **Yes** | **Yes** | No | No | No | No | No |
| `refund:approve_high_value` | **Yes*** | **Yes** | **Yes** | No | No | No | No | No | No |
| `seller:view` | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | No | **Yes** | No |
| `seller:suspend` | **Yes*** | No | **Yes** | No | **Yes** | No | No | No | No |
| `seller:emergency_freeze` | **Yes** | No | **Yes** | No | No | No | No | No | No |
| `seller:bank_detail_change`| **Yes*** | **Yes** | No | No | **Yes** | No | No | No | No |
| `kyc:verify` | **Yes** | No | **Yes** | No | **Yes** | No | No | No | No |
| `catalog:moderate` | **Yes** | No | **Yes** | No | No | **Yes** | No | No | No |
| `category:view` | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | No |
| `category:manage` | **Yes** | No | No | No | No | **Yes** | No | No | No |
| `merchandising:publish` | **Yes*** | No | No | No | No | No | **Yes** | No | No |
| `pii:reveal` | **Yes** | **Yes** | **Yes** | No | **Yes** | No | No | No | **BLOCKED** |
| `customer:impersonate` | **Yes** | No | No | **Yes** | No | No | No | No | No |
| `kill_switch:view` | **Yes** | **Yes** | **Yes** | No | No | No | No | **Yes** | **Yes** |
| `kill_switch:manage` | **Yes** | **Yes** | **Yes** | No | No | No | No | No | No |
| `elevation:request` | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** |
| `elevation:break_glass` | **Yes** | No | No | No | No | No | No | No | No |
| `elevation:view` | **Yes** | No | No | No | No | No | No | **Yes** | **Yes** |
| `elevation:revoke` | **Yes** | No | No | No | No | No | No | No | No |
| `access_review:view` | **Yes** | No | No | No | No | No | No | **Yes** | No |
| `access_review:attest` | **Yes** | No | No | No | No | No | No | **Yes** | No |

*\* Note on Super Admin:* Super Admin privileges are capped by configuration and governance invariants: **Super Admins cannot self-approve any action they initiated.**

---

## 4. Separation of Duties (SoD) Invariants

Separation of Duties is strictly enforced in code and at the database transaction layer:

1. **Self-Approval Prohibition:**
   The admin who creates an approval request (`requester_id`) can **never** approve it (`approver_id === requester_id` raises a 403 Forbidden exception).
2. **Payout Batch Segregation:**
   The admin who creates or compiles a seller payout batch is barred from approving or dispatching the payout.
3. **Seller Onboarding vs. Bank Detail Modification:**
   The admin who verified and onboarded a seller is prohibited from approving subsequent modifications to that seller's bank account numbers.
4. **Emergency Freeze vs. Permanent Ban:**
   An emergency fraud freeze can be initiated by a single Trust & Safety actor to prevent fund siphoning, but requires a mandatory secondary review and permanent ban decision by an independent decider.
5. **Support Engineer Production PII Lockout:**
   The `support_engineer` role is hard-blocked in code from invoking `pii:reveal`, even if temporarily granted elevation without formal approval.

---

## 5. Passkey (FIDO2/WebAuthn) & Step-Up Requirements

- **Mandatory Passkeys:** Required on every session for `super_admin`, `finance_controller`, and any admin holding `payout:approve`, `pii:reveal`, or `seller:bank_detail_change`.
- **Step-Up Verification:** Sensitive actions (approving payouts, changing seller bank coordinates, revealing PII, toggling kill switches) require a fresh passkey tap within the last 5 minutes.

---

## 6. Super Admin Wildcard Security Finding & Hardening (Phase 1b)

### 6.1 Guard Wildcard Implementation
In `apps/api/src/modules/admin-core/rbac/rbac.service.ts` (lines 126–135):
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

### 6.2 Architectural Conflict & Rule 9 Trigger
1. **Unconditional Bypass**: Any admin user assigned `super_admin` bypasses all `@RequirePermission` decorators in `AdminAuthGuard`, rendering granular `role_permissions` table assignments inert for that role.
2. **Least-Privilege Conflict**: Step B requires assigning permissions to roles by least privilege (e.g. `kill_switch:manage`, `elevation:break_glass`, `admin:create/offboard` strictly to Super Admin, while other actions are segregated). The wildcard bypass circumvents this matrix in application logic.
3. **Contrast with Legacy RolesGuard**:
   - `RolesGuard` contains a legacy bypass for `'admin'` (`if (userRoles.includes('admin')) return true;`), explicitly preserved per Phase 1b Rule 3.
   - `AdminAuthGuard` / `RbacService` governs zero-trust administrative operations and triggers **Rule 9** (*"STOP and report if any test fails, if you would need to edit an old test, or if the Super Admin role is a wildcard in the guard"*).

### 6.3 Remediation Specification
To transition Super Admin to an explicit permission model:
1. In `RbacService.hasPermission()`, remove `if (isSuperAdmin) return true;`.
2. Seed the complete set of required permissions for `super_admin` directly into `public.role_permissions` via `supabase/migrations/00009_admin_hardening_phase1b.sql`.
3. Four-eyes policies (`assertSeparationOfDuties()`) and incident kill switches will continue to govern Super Admin execution without unconstrained permission wildcards.

