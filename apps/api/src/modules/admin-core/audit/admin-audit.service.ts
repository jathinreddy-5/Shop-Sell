import { Injectable, Inject, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '../../../database/database.service';
import { AdminAuditLog } from '@shop-sell/shared';
import { sanitizeAuditPayload } from './audit-redaction.util';
import { AUDIT_WORM_SINK_TOKEN, AuditWormSink, WormExportReceipt } from './audit-worm-sink.interface';
import { ADMIN_ALERT_SINK_TOKEN, AdminAlertSink } from './admin-alert.interface';

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);
  private recentRefundCounter = 0;
  private lastRefundCheckReset = Date.now();

  constructor(
    private readonly db: DatabaseService,
    @Inject(AUDIT_WORM_SINK_TOKEN) private readonly wormSink: AuditWormSink,
    @Inject(ADMIN_ALERT_SINK_TOKEN) private readonly alertSink: AdminAlertSink
  ) {}

  /**
   * Appends an immutable, hash-chained entry to the audit log.
   * All PII and credentials in before_state and after_state are automatically sanitized.
   */
  async logEvent(params: {
    actor_admin_id?: string | null;
    actor_role_at_time: string;
    action: string;
    resource_type: string;
    resource_id?: string | null;
    outcome: 'success' | 'denied' | 'error';
    reason?: string | null;
    ticket_ref?: string | null;
    before_state?: any;
    after_state?: any;
    approver_ids?: string[];
    request_id?: string | null;
    session_id?: string | null;
    ip_address?: string | null;
    user_agent?: string | null;
  }): Promise<AdminAuditLog> {
    const sanitizedBefore = sanitizeAuditPayload(params.before_state);
    const sanitizedAfter = sanitizeAuditPayload(params.after_state);

    return this.db.withTransaction(async (client) => {
      // 1. Fetch latest row_hash for hash chaining
      const latestRowRes = await client.query<{ row_hash: string }>(
        `SELECT row_hash FROM public.admin_audit_logs ORDER BY created_at DESC, id DESC LIMIT 1 FOR UPDATE`
      );
      const prevHash = latestRowRes.rows.length > 0 ? latestRowRes.rows[0].row_hash : GENESIS_HASH;

      // 2. Canonical serialization for deterministic SHA-256 calculation
      const canonicalData = JSON.stringify({
        actor_admin_id: params.actor_admin_id || null,
        actor_role_at_time: params.actor_role_at_time,
        action: params.action,
        resource_type: params.resource_type,
        resource_id: params.resource_id || null,
        outcome: params.outcome,
        reason: params.reason || null,
        ticket_ref: params.ticket_ref || null,
        before_state: sanitizedBefore || null,
        after_state: sanitizedAfter || null,
        approver_ids: params.approver_ids || [],
        ip_address: params.ip_address || null,
        prev_hash: prevHash,
      });

      const rowHash = crypto.createHash('sha256').update(canonicalData).digest('hex');

      // 3. Insert into immutable table
      const insertRes = await client.query<AdminAuditLog>(
        `INSERT INTO public.admin_audit_logs (
           actor_admin_id, actor_role_at_time, action, resource_type,
           resource_id, outcome, reason, ticket_ref, before_state,
           after_state, approver_ids, request_id, session_id,
           ip_address, user_agent, prev_hash, row_hash, created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
         RETURNING *`,
        [
          params.actor_admin_id || null,
          params.actor_role_at_time,
          params.action,
          params.resource_type,
          params.resource_id || null,
          params.outcome,
          params.reason || null,
          params.ticket_ref || null,
          sanitizedBefore ? JSON.stringify(sanitizedBefore) : null,
          sanitizedAfter ? JSON.stringify(sanitizedAfter) : null,
          params.approver_ids || [],
          params.request_id || null,
          params.session_id || null,
          params.ip_address || null,
          params.user_agent || null,
          prevHash,
          rowHash,
        ]
      );

      const savedLog = insertRes.rows[0];

      // 4. Anomaly detection checks (async, non-blocking to transaction)
      this.evaluateAnomalyTriggers(savedLog).catch((err) =>
        this.logger.error(`Error in anomaly evaluation: ${err.message}`)
      );

      return savedLog;
    });
  }

  /**
   * Logs reads of sensitive data (PII reveals, KYC document views, financial exports).
   */
  async logSensitiveRead(params: {
    actor_admin_id: string;
    actor_role_at_time: string;
    resource_type: string;
    resource_id: string;
    reason: string;
    ticket_ref?: string;
    ip_address?: string;
    user_agent?: string;
  }): Promise<AdminAuditLog> {
    return this.logEvent({
      actor_admin_id: params.actor_admin_id,
      actor_role_at_time: params.actor_role_at_time,
      action: 'read:sensitive_pii',
      resource_type: params.resource_type,
      resource_id: params.resource_id,
      outcome: 'success',
      reason: params.reason,
      ticket_ref: params.ticket_ref,
      ip_address: params.ip_address,
      user_agent: params.user_agent,
    });
  }

  /**
   * Verifies the SHA-256 hash chain across recent audit records.
   * Proves that no records were deleted, inserted, or modified in the database.
   */
  async verifyAuditChain(limit = 100): Promise<{
    isValid: boolean;
    verifiedRecords: number;
    brokenAtId?: string;
    message: string;
  }> {
    const res = await this.db.query<AdminAuditLog>(
      `SELECT * FROM public.admin_audit_logs ORDER BY created_at ASC, id ASC LIMIT $1`,
      [limit]
    );

    const rows = res.rows;
    if (rows.length === 0) {
      return { isValid: true, verifiedRecords: 0, message: 'Audit log is empty (Genesis state)' };
    }

    let expectedPrevHash = GENESIS_HASH;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // 1. Verify prev_hash matches the previous record's row_hash
      if (i > 0 && row.prev_hash !== expectedPrevHash) {
        await this.alertSink.dispatchAlert({
          alertType: 'AUDIT_CHAIN_INTEGRITY_FAILURE',
          severity: 'CRITICAL',
          title: 'Audit Log Hash Chain Broken (prev_hash mismatch)',
          description: `Discrepancy detected at log ID ${row.id}. Expected prev_hash ${expectedPrevHash}, found ${row.prev_hash}`,
          timestamp: new Date().toISOString(),
        });
        return {
          isValid: false,
          verifiedRecords: i,
          brokenAtId: row.id,
          message: `Hash chain broken at record ${row.id}: prev_hash mismatch`,
        };
      }

      // 2. Recompute row_hash from canonical fields
      const canonicalData = JSON.stringify({
        actor_admin_id: row.actor_admin_id || null,
        actor_role_at_time: row.actor_role_at_time,
        action: row.action,
        resource_type: row.resource_type,
        resource_id: row.resource_id || null,
        outcome: row.outcome,
        reason: row.reason || null,
        ticket_ref: row.ticket_ref || null,
        before_state: row.before_state || null,
        after_state: row.after_state || null,
        approver_ids: row.approver_ids || [],
        ip_address: row.ip_address || null,
        prev_hash: row.prev_hash || GENESIS_HASH,
      });

      const calculatedHash = crypto.createHash('sha256').update(canonicalData).digest('hex');

      if (calculatedHash !== row.row_hash) {
        await this.alertSink.dispatchAlert({
          alertType: 'AUDIT_CHAIN_INTEGRITY_FAILURE',
          severity: 'CRITICAL',
          title: 'Audit Log Content Tamper Detected',
          description: `Calculated hash ${calculatedHash} does not match stored row_hash ${row.row_hash} for log ID ${row.id}`,
          timestamp: new Date().toISOString(),
        });
        return {
          isValid: false,
          verifiedRecords: i,
          brokenAtId: row.id,
          message: `Tamper detected at record ${row.id}: stored row_hash does not match recomputed payload hash`,
        };
      }

      expectedPrevHash = row.row_hash;
    }

    return {
      isValid: true,
      verifiedRecords: rows.length,
      message: `Successfully verified hash-chain integrity across ${rows.length} audit records.`,
    };
  }

  /**
   * Queries audit logs with filtering and pagination.
   */
  async queryAuditLogs(filter: {
    actor_admin_id?: string;
    action?: string;
    resource_type?: string;
    outcome?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AdminAuditLog[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filter.actor_admin_id) {
      conditions.push(`actor_admin_id = $${idx++}`);
      values.push(filter.actor_admin_id);
    }
    if (filter.action) {
      conditions.push(`action ILIKE $${idx++}`);
      values.push(`%${filter.action}%`);
    }
    if (filter.resource_type) {
      conditions.push(`resource_type = $${idx++}`);
      values.push(filter.resource_type);
    }
    if (filter.outcome) {
      conditions.push(`outcome = $${idx++}`);
      values.push(filter.outcome);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filter.limit || 50;
    const offset = filter.offset || 0;

    const countRes = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM public.admin_audit_logs ${whereClause}`,
      values
    );

    const logsRes = await this.db.query<AdminAuditLog>(
      `SELECT * FROM public.admin_audit_logs ${whereClause} ORDER BY created_at DESC, id DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    );

    return {
      logs: logsRes.rows,
      total: parseInt(countRes.rows[0]?.count || '0', 10),
    };
  }

  /**
   * Asynchronously exports recent audit logs to an external WORM sink (S3 Object Lock / Vault).
   */
  async exportAuditBatchToWorm(limit = 500): Promise<WormExportReceipt> {
    const res = await this.db.query<AdminAuditLog>(
      `SELECT * FROM public.admin_audit_logs ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );

    const receipt = await this.wormSink.exportBatch(res.rows);
    return receipt;
  }

  private async evaluateAnomalyTriggers(log: AdminAuditLog): Promise<void> {
    // 1. Break-Glass elevation
    if (log.action.includes('break_glass')) {
      await this.alertSink.dispatchAlert({
        alertType: 'BREAK_GLASS_INVOKED',
        severity: 'CRITICAL',
        title: 'Emergency Break-Glass Access Invoked',
        description: `Admin ${log.actor_admin_id} activated emergency elevation. Reason: ${log.reason || 'None provided'}. Ticket: ${log.ticket_ref || 'None'}`,
        actorAdminId: log.actor_admin_id || undefined,
        timestamp: log.created_at,
      });
    }

    // 2. Mass PII export
    if (log.action === 'pii:export' || log.action === 'export:audit') {
      await this.alertSink.dispatchAlert({
        alertType: 'MASS_PII_EXPORT',
        severity: 'WARNING',
        title: 'Bulk Data Export Executed',
        description: `Admin ${log.actor_admin_id} executed ${log.action} on resource ${log.resource_type}`,
        actorAdminId: log.actor_admin_id || undefined,
        timestamp: log.created_at,
      });
    }

    // 3. Repeated denied access attempts
    if (log.outcome === 'denied') {
      await this.alertSink.dispatchAlert({
        alertType: 'REPEATED_ACCESS_DENIED',
        severity: 'WARNING',
        title: 'Admin Access Denied Event',
        description: `Unauthorized attempt for action ${log.action} on ${log.resource_type} by actor ${log.actor_admin_id || 'unknown'}`,
        actorAdminId: log.actor_admin_id || undefined,
        timestamp: log.created_at,
      });
    }

    // 4. Refund velocity check
    if (log.action.includes('refund')) {
      const now = Date.now();
      if (now - this.lastRefundCheckReset > 60 * 60 * 1000) {
        this.recentRefundCounter = 0;
        this.lastRefundCheckReset = now;
      }
      this.recentRefundCounter++;
      if (this.recentRefundCounter > 20) {
        await this.alertSink.dispatchAlert({
          alertType: 'REFUND_SPIKE',
          severity: 'CRITICAL',
          title: 'Unusual Refund Velocity Spike Detected',
          description: `More than 20 refund actions recorded in the last 60 minutes. Current count: ${this.recentRefundCounter}`,
          timestamp: log.created_at,
        });
      }
    }
  }
}
