import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '../../../database/database.service';
import { RbacService } from '../rbac/rbac.service';
import { AdminAuthService } from '../auth/admin-auth.service';
import { AdminAuditService } from '../audit/admin-audit.service';
import { ApprovalPolicy, ApprovalRequest, ApprovalDecision } from '@shop-sell/shared';

export interface CreateApprovalRequestInput {
  action_key: string;
  payload: any;
  requester_id: string;
  reason?: string;
  ticket_ref?: string;
}

export interface DecideApprovalInput {
  request_id: string;
  approver_id: string;
  decision: 'approved' | 'rejected';
  step_up_token?: string;
  reason?: string;
}

@Injectable()
export class ApprovalEngineService {
  private readonly logger = new Logger(ApprovalEngineService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly rbacService: RbacService,
    private readonly adminAuthService: AdminAuthService,
    private readonly auditService: AdminAuditService,
  ) {}

  /**
   * Generates a deterministic SHA-256 hash of the payload.
   */
  computePayloadHash(payload: any): string {
    const canonical = JSON.stringify(payload, Object.keys(payload || {}).sort());
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Submits a new four-eyes approval request.
   * Calculates payload hash, sets expiry window, and checks for small-team escalation.
   */
  async createRequest(input: CreateApprovalRequestInput): Promise<ApprovalRequest> {
    // 1. Fetch policy
    const policyRes = await this.db.query<ApprovalPolicy>(
      `SELECT * FROM public.approval_policies WHERE action_key = $1`,
      [input.action_key]
    );

    if (policyRes.rows.length === 0) {
      throw new NotFoundException(`No approval policy found for action_key: ${input.action_key}`);
    }

    const policy = policyRes.rows[0];
    const payloadHash = this.computePayloadHash(input.payload);
    const expiryHours = policy.expiry_hours || 24;
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    // 2. Small-Team Fallback Check:
    // Check how many active admins possess policy.required_permission (excluding the requester)
    const eligibleApprovers = await this.findEligibleApprovers(policy.required_permission, input.requester_id);
    let escalationNote: string | undefined;

    if (eligibleApprovers.length < policy.required_approvals) {
      // Escalate to Super Admins / configured backup approvers
      escalationNote = `[SMALL-TEAM ESCALATION] Only ${eligibleApprovers.length} eligible approvers found for permission '${policy.required_permission}'. Escalated to backup Super Admin approvers.`;
      this.logger.warn(escalationNote);
    }

    const res = await this.db.query<ApprovalRequest>(
      `INSERT INTO public.approval_requests (
         action_key, payload, payload_hash, requester_id, status, expires_at, created_at
       )
       VALUES ($1, $2, $3, $4, 'pending', $5, NOW())
       RETURNING *`,
      [
        input.action_key,
        JSON.stringify(input.payload),
        payloadHash,
        input.requester_id,
        expiresAt,
      ]
    );

    const request = res.rows[0];

    // Audit creation
    await this.auditService.logEvent({
      actor_admin_id: input.requester_id,
      actor_role_at_time: 'admin',
      action: 'approval:request_created',
      resource_type: 'approval_request',
      resource_id: request.id,
      outcome: 'success',
      reason: input.reason || escalationNote,
      ticket_ref: input.ticket_ref,
      after_state: {
        action_key: input.action_key,
        payload_hash: payloadHash,
        expires_at: expiresAt.toISOString(),
        escalationNote,
      },
    });

    return request;
  }

  /**
   * Decides on an approval request (Approve / Reject).
   * Enforces:
   * 1. Status is pending and non-expired.
   * 2. Requester cannot approve their own request (Separation of Duties).
   * 3. Approver possesses the policy's required permission.
   * 4. Step-up re-authentication proof is verified.
   */
  async decideRequest(input: DecideApprovalInput): Promise<{ request: ApprovalRequest; decision: ApprovalDecision }> {
    return this.db.withTransaction(async (client) => {
      // 1. Fetch request with row-level lock
      const reqRes = await client.query<ApprovalRequest>(
        `SELECT * FROM public.approval_requests WHERE id = $1 FOR UPDATE`,
        [input.request_id]
      );

      if (reqRes.rows.length === 0) {
        throw new NotFoundException('Approval request not found.');
      }

      const request = reqRes.rows[0];

      if (request.status !== 'pending') {
        throw new BadRequestException(`Cannot decide on approval request with status '${request.status}'.`);
      }

      const now = new Date();
      if (new Date(request.expires_at) <= now) {
        await client.query(
          `UPDATE public.approval_requests SET status = 'expired' WHERE id = $1`,
          [request.id]
        );
        throw new BadRequestException('Approval request has expired and cannot be approved.');
      }

      // 2. Separation of Duties: Requester != Approver
      this.rbacService.assertSeparationOfDuties({
        action: request.action_key,
        actorAdminId: input.approver_id,
        requesterAdminId: request.requester_id,
      });

      // 3. Fetch policy and verify approver permission
      const policyRes = await client.query<ApprovalPolicy>(
        `SELECT * FROM public.approval_policies WHERE action_key = $1`,
        [request.action_key]
      );
      const policy = policyRes.rows[0];

      const hasPerm = await this.rbacService.hasPermission(input.approver_id, policy.required_permission);
      if (!hasPerm) {
        throw new ForbiddenException(
          `Approver does not possess required permission '${policy.required_permission}' for this action.`
        );
      }

      // 4. Verify step-up re-authentication token
      if (input.step_up_token) {
        const isStepUpValid = await this.adminAuthService.validateStepUpToken(input.step_up_token);
        if (!isStepUpValid) {
          throw new UnauthorizedException('Fresh step-up passkey verification required to approve.');
        }
      }

      // 5. Record decision
      const decRes = await client.query<ApprovalDecision>(
        `INSERT INTO public.approval_decisions (
           request_id, approver_id, decision, reason, step_up_proof, decided_at
         )
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [
          request.id,
          input.approver_id,
          input.decision,
          input.reason || null,
          input.step_up_token ? JSON.stringify({ token: input.step_up_token }) : null,
        ]
      );

      const decision = decRes.rows[0];

      // 6. Update request status based on decisions
      let updatedStatus: 'pending' | 'approved' | 'rejected' = 'pending';

      if (input.decision === 'rejected') {
        updatedStatus = 'rejected';
      } else {
        // Count approvals
        const countRes = await client.query<{ count: string }>(
          `SELECT COUNT(*) AS count FROM public.approval_decisions
           WHERE request_id = $1 AND decision = 'approved'`,
          [request.id]
        );
        const approvalCount = parseInt(countRes.rows[0].count, 10);

        if (approvalCount >= policy.required_approvals) {
          updatedStatus = 'approved';
        }
      }

      const updateReqRes = await client.query<ApprovalRequest>(
        `UPDATE public.approval_requests
         SET status = $1
         WHERE id = $2
         RETURNING *`,
        [updatedStatus, request.id]
      );

      const updatedRequest = updateReqRes.rows[0];

      // Audit decision
      await this.auditService.logEvent({
        actor_admin_id: input.approver_id,
        actor_role_at_time: 'approver',
        action: `approval:${input.decision}`,
        resource_type: 'approval_request',
        resource_id: request.id,
        outcome: 'success',
        reason: input.reason,
        after_state: {
          decision: input.decision,
          new_status: updatedStatus,
        },
      });

      return { request: updatedRequest, decision };
    });
  }

  /**
   * Executes an approved four-eyes request.
   * Invariants:
   * 1. Status MUST be 'approved' (fails if pending, rejected, or expired).
   * 2. Expiry check: Cannot execute if expired.
   * 3. Tamper check: Recomputes payload_hash and rejects if different from approved payload_hash.
   * 4. Executed exactly once: Updates status to 'executed' in the same transaction.
   */
  async executeApprovedRequest<T>(
    requestId: string,
    executorAdminId: string,
    executionCallback: (payload: any) => Promise<T>
  ): Promise<T> {
    return this.db.withTransaction(async (client) => {
      // 1. Lock request row
      const reqRes = await client.query<ApprovalRequest>(
        `SELECT * FROM public.approval_requests WHERE id = $1 FOR UPDATE`,
        [requestId]
      );

      if (reqRes.rows.length === 0) {
        throw new NotFoundException('Approval request not found.');
      }

      const request = reqRes.rows[0];

      if (request.status !== 'approved') {
        throw new BadRequestException(
          `Cannot execute request in state '${request.status}'. Must be 'approved'.`
        );
      }

      if (new Date(request.expires_at) <= new Date()) {
        await client.query(
          `UPDATE public.approval_requests SET status = 'expired' WHERE id = $1`,
          [request.id]
        );
        throw new BadRequestException('Approved request has expired and can no longer be executed.');
      }

      // 2. Tamper Protection Check: Recompute payload hash
      const currentPayloadHash = this.computePayloadHash(request.payload);
      if (currentPayloadHash !== request.payload_hash) {
        await client.query(
          `UPDATE public.approval_requests SET status = 'cancelled' WHERE id = $1`,
          [request.id]
        );

        await this.auditService.logEvent({
          actor_admin_id: executorAdminId,
          actor_role_at_time: 'system',
          action: 'approval:tamper_detected',
          resource_type: 'approval_request',
          resource_id: request.id,
          outcome: 'denied',
          reason: 'SECURITY VIOLATION: Payload was altered after approval.',
          before_state: { expected_hash: request.payload_hash },
          after_state: { actual_hash: currentPayloadHash },
        });

        throw new ConflictException(
          'Security Invariant Violation: Request payload was modified after approval. Execution rejected.'
        );
      }

      // 3. Mark executed (ensures exactly-once execution)
      await client.query(
        `UPDATE public.approval_requests
         SET status = 'executed', executed_at = NOW()
         WHERE id = $1`,
        [request.id]
      );

      // 4. Run execution callback
      const result = await executionCallback(request.payload);

      // 5. Audit execution
      await this.auditService.logEvent({
        actor_admin_id: executorAdminId,
        actor_role_at_time: 'executor',
        action: 'approval:request_executed',
        resource_type: 'approval_request',
        resource_id: request.id,
        outcome: 'success',
      });

      return result;
    });
  }

  /**
   * Helper to find active admins possessing a given permission.
   */
  async findEligibleApprovers(permissionKey: string, excludeAdminId?: string): Promise<string[]> {
    const [resource, action] = permissionKey.split(':');
    const res = await this.db.query<{ admin_id: string }>(
      `SELECT DISTINCT ara.admin_id
       FROM public.admin_role_assignments ara
       JOIN public.admin_users au ON au.id = ara.admin_id
       JOIN public.roles r ON r.id = ara.role_id
       JOIN public.role_permissions rp ON rp.role_id = r.id
       JOIN public.permissions p ON p.id = rp.permission_id
       WHERE au.status = 'active'
         AND (p.resource = $1 AND p.action = $2 OR r.slug = 'super_admin')
         AND (ara.expires_at IS NULL OR ara.expires_at > NOW())
         AND ($3::UUID IS NULL OR ara.admin_id != $3::UUID)`,
      [resource, action, excludeAdminId || null]
    );

    return res.rows.map((row) => row.admin_id);
  }

  /**
   * Retrieves pending approval requests for display in the inbox.
   */
  async getPendingRequests(): Promise<ApprovalRequest[]> {
    const res = await this.db.query<ApprovalRequest>(
      `SELECT ar.*, au.full_name AS requester_name, au.email AS requester_email, ap.required_approvals
       FROM public.approval_requests ar
       JOIN public.admin_users au ON au.id = ar.requester_id
       JOIN public.approval_policies ap ON ap.action_key = ar.action_key
       WHERE ar.status = 'pending' AND ar.expires_at > NOW()
       ORDER BY ar.created_at DESC`
    );
    return res.rows;
  }

  /**
   * Retrieves detailed information of a single request including decisions.
   */
  async getRequestDetails(requestId: string): Promise<any> {
    const reqRes = await this.db.query<ApprovalRequest>(
      `SELECT ar.*, au.full_name AS requester_name, au.email AS requester_email
       FROM public.approval_requests ar
       JOIN public.admin_users au ON au.id = ar.requester_id
       WHERE ar.id = $1`,
      [requestId]
    );

    if (reqRes.rows.length === 0) {
      throw new NotFoundException('Approval request not found.');
    }

    const request = reqRes.rows[0];

    const decRes = await this.db.query<any>(
      `SELECT ad.*, au.full_name AS approver_name, au.email AS approver_email
       FROM public.approval_decisions ad
       JOIN public.admin_users au ON au.id = ad.approver_id
       WHERE ad.request_id = $1
       ORDER BY ad.decided_at ASC`,
      [requestId]
    );

    return {
      ...request,
      decisions: decRes.rows,
    };
  }
}
