# Shop:Sell Immutable Audit Trail Architecture

## 1. Overview & Security Mandate
The Shop:Sell Admin Audit Trail (`public.admin_audit_logs`) provides a cryptographically verifiable, append-only chronological record of every administrative action, authorization decision, sensitive data read, and security anomaly across the platform.

All administrative mutations and sensitive reads are intercepted and recorded with zero exposure of raw PII, credentials, PAN, or bank coordinates.

---

## 2. Audit Record Schema

Every entry in `public.admin_audit_logs` contains:

```sql
CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_admin_id UUID REFERENCES public.admin_users(id),
  actor_role_at_time TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'denied', 'error')),
  reason TEXT,
  ticket_ref TEXT,
  before_state JSONB,
  after_state JSONB,
  approver_ids UUID[] DEFAULT '{}',
  request_id TEXT,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  prev_hash TEXT,
  row_hash TEXT NOT NULL
);
```

### Central PII & Secret Redaction
Before any payload enters `before_state` or `after_state`, it passes through `audit-redaction.util.ts`:
- **Payment Card Numbers (PAN):** Replaced with `•••• •••• •••• 1234`
- **Bank Account Numbers:** Replaced with `••••••••1234`
- **Email Addresses:** Masked to `j••••@domain.com`
- **Phone Numbers:** Masked to `+91 ••••• ••421`
- **Secrets & Credentials:** Passwords, JWT tokens, AWS/API keys, Bearer headers, and OTP codes are redacted to `[REDACTED_SECRET]`.

---

## 3. Layered Tamper Protection

Security at rest is achieved via three complementary defense layers:

### Layer 1: PostgreSQL Insert-Only Privilege & Immutability Trigger
At the database level, the table permissions strictly prohibit `UPDATE`, `DELETE`, and `TRUNCATE`. An execution trigger (`trg_audit_logs_no_update_delete`) intercepts any row modification or deletion attempt:
```sql
CREATE TRIGGER trg_audit_logs_no_update_delete
BEFORE UPDATE OR DELETE ON public.admin_audit_logs
FOR EACH ROW EXECUTE FUNCTION trg_enforce_audit_log_immutability();
```
Any attempt to tamper with existing records causes an immediate transaction rollback with `Security Invariant Violation`.

### Layer 2: Cryptographic SHA-256 Hash Chaining
Each row's `row_hash` is calculated deterministically from its canonical fields combined with the `prev_hash` of the immediately preceding row:
$$\text{row\_hash}_n = \text{SHA-256}(\text{CanonicalJSON}(Row_n) \parallel \text{row\_hash}_{n-1})$$
The platform provides an on-demand and scheduled verification procedure (`verifyAuditChain()` in `AdminAuditService`). If any record was altered, deleted, or backdated, the verification algorithm detects the discrepancy immediately, pinpoints the broken ID, and dispatches a `CRITICAL` alert to Super Admins and the Compliance team.

### Layer 3: Append-Only WORM Storage (Write Once, Read Many)

> [!CAUTION]
> **Honest Security Posture Disclosure:**
> Layers 1 and 2 operate within the primary PostgreSQL database. A compromised database administrator, Cloud Console superuser, or direct Supabase Service Role credentials could theoretically disable PostgreSQL triggers or manipulate raw table blocks.
>
> **This is why Layer 3 is non-negotiable.**

To defeat inside-attacker and compromised-DB threats, audit batches are regularly extracted and streamed to an external, write-once immutable storage repository:
- **AWS S3 Object Lock (Compliance Mode) / Cloudflare R2 / Google Cloud Storage Bucket Lock:**
  Objects stored in Compliance Mode **cannot be overwritten or deleted by any user**, including the AWS root account, until the retention period (e.g. 7 years for financial records) expires.
- **Pluggable Sink Interface:** `AuditWormSink` interface allows seamless switching between `LocalWormSinkService` (local encrypted immutable vault for testing) and `S3ObjectLockSinkService` (AWS S3 Object Lock).
- **Export Checkpoints & Receipts:** Every export produces a signed `WormExportReceipt` containing the batch hash, record count, and immutable storage URI.

---

## 4. Sensitive Reads & Denied Attempt Auditing

The audit system records both mutations and reads of sensitive resources:
- **PII Reveals:** Every invocation of `/api/admin/security/pii-reveal` logs the requesting admin, the justification reason, the step-up token ID, and the exact field accessed.
- **Denied Access:** Unauthorized attempts by any actor (including lack of permission or blocked IP addresses) are recorded with `outcome = 'denied'`.
- **Customer Impersonation:** Every read-only customer view-as session is logged with time limits, customer ID, ticket reference, and the supervising admin ID.

---

## 5. Security Anomaly Alerting Rules

The audit engine evaluates events in real time against key anomaly heuristics:
1. **Refund Spike:** More than 20 refund actions within a rolling 60-minute window triggers a `CRITICAL` alert.
2. **Bulk Data Export:** Any mass export (`pii:export` or `export:audit`) triggers a `WARNING` alert with actor metadata.
3. **Emergency Break-Glass:** Immediate `CRITICAL` notification dispatched to all Super Admins and Compliance Officers whenever single-actor break-glass elevation is activated.
4. **Repeated Denied Attempts:** High velocity of 403 Forbidden responses from a single IP or session triggers automated rate limiting and security alarms.
