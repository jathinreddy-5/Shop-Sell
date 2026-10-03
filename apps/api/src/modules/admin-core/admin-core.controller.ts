import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Req,
  Res,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import { AdminAuthGuard, AdminRequest } from './rbac/admin-auth.guard';
import { AuditInterceptor } from './audit/audit.interceptor';
import { RequirePermission, PublicAdmin, SkipAudit } from './rbac/require-permission.decorator';
import { AdminAuthService } from './auth/admin-auth.service';
import { RbacService } from './rbac/rbac.service';
import { ElevationService } from './rbac/elevation.service';
import { AccessReviewService } from './rbac/access-review.service';
import { ApprovalEngineService } from './approvals/approval-engine.service';
import { AdminAuditService } from './audit/admin-audit.service';
import { KillSwitchService } from './kill-switch/kill-switch.service';
import { PiiRevealService } from './security/pii-reveal.service';
import { CustomerImpersonationService } from './security/customer-impersonation.service';
import { DatabaseService } from '../../database/database.service';
import {
  AdminLoginDto,
  PasskeyVerifyDto,
  StepUpChallengeDto,
  StepUpVerifyDto,
  CreateApprovalRequestDto,
  DecideApprovalDto,
  BreakGlassDto,
  JitElevationDto,
  ToggleKillSwitchDto,
  RevealPiiDto,
  ImpersonateCustomerDto,
  InviteAdminDto,
} from './dto/admin-core.dto';

@Controller('admin')
@UseGuards(AdminAuthGuard)
@UseInterceptors(AuditInterceptor)
export class AdminCoreController {
  constructor(
    private readonly db: DatabaseService,
    private readonly authService: AdminAuthService,
    private readonly rbacService: RbacService,
    private readonly elevationService: ElevationService,
    private readonly accessReviewService: AccessReviewService,
    private readonly approvalService: ApprovalEngineService,
    private readonly auditService: AdminAuditService,
    private readonly killSwitchService: KillSwitchService,
    private readonly piiRevealService: PiiRevealService,
    private readonly impersonationService: CustomerImpersonationService,
  ) {}

  // ==========================================
  // 1. ADMIN AUTH & PASSKEYS
  // ==========================================

  @PublicAdmin()
  @Post('auth/login')
  async login(
    @Body() dto: AdminLoginDto,
    @Req() req: AdminRequest,
    @Res({ passthrough: true }) res: Response
  ) {
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

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

    // Set dedicated secure admin cookie
    res.cookie('shopsell_admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/admin',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    return {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.full_name,
        requiresPasskey: admin.requires_passkey,
      },
      session,
    };
  }

  @PublicAdmin()
  @Post('auth/passkey/challenge')
  async getPasskeyChallenge(@Body('adminId') adminId: string) {
    return this.authService.generatePasskeyChallenge(adminId);
  }

  @PublicAdmin()
  @Post('auth/passkey/verify')
  async verifyPasskey(@Body() dto: PasskeyVerifyDto) {
    return this.authService.verifyStepUpProof(dto.adminId, dto.challengeId, dto.proof);
  }

  @RequirePermission('admin:session_manage')
  @Post('auth/step-up/challenge')
  async getStepUpChallenge(@Req() req: AdminRequest, @Body() dto: StepUpChallengeDto) {
    return this.authService.generateStepUpChallenge(req.adminUser!.id, dto.action);
  }

  @RequirePermission('admin:session_manage')
  @Post('auth/step-up/verify')
  async verifyStepUp(@Req() req: AdminRequest, @Body() dto: StepUpVerifyDto) {
    return this.authService.verifyStepUpProof(req.adminUser!.id, dto.challengeId, dto.proof);
  }

  @RequirePermission('admin:session_manage')
  @Post('auth/logout')
  async logout(@Req() req: AdminRequest, @Res({ passthrough: true }) res: Response) {
    const adminUser = req.adminUser!;
    await this.authService.revokeSession(adminUser.sessionId, adminUser.id, 'User initiated logout');
    res.clearCookie('shopsell_admin_token', { path: '/admin' });
    return { success: true, message: 'Logged out successfully.' };
  }

  @RequirePermission('admin:session_manage')
  @Get('auth/me')
  async getMe(@Req() req: AdminRequest) {
    const adminId = req.adminUser!.id;
    const adminRes = await this.db.query<any>(
      `SELECT id, email, full_name, status, mfa_enrolled, requires_passkey, last_review_at FROM public.admin_users WHERE id = $1`,
      [adminId]
    );
    const roles = await this.rbacService.getAdminRoles(adminId);
    const permissions = await this.rbacService.getAdminPermissions(adminId);

    return {
      admin: adminRes.rows[0],
      roles,
      permissions,
      sessionId: req.adminUser!.sessionId,
    };
  }

  // ==========================================
  // 2. APPROVAL ENGINE (FOUR-EYES)
  // ==========================================

  @RequirePermission('approval:view')
  @Get('approvals')
  async listApprovals() {
    return this.approvalService.getPendingRequests();
  }

  @RequirePermission('approval:view')
  @Get('approvals/:id')
  async getApprovalDetails(@Param('id') id: string) {
    return this.approvalService.getRequestDetails(id);
  }

  @RequirePermission('approval:request')
  @Post('approvals')
  async createApprovalRequest(@Req() req: AdminRequest, @Body() dto: CreateApprovalRequestDto) {
    return this.approvalService.createRequest({
      action_key: dto.action_key,
      payload: dto.payload,
      requester_id: req.adminUser!.id,
      reason: dto.reason,
      ticket_ref: dto.ticket_ref,
    });
  }

  @RequirePermission('approval:decide')
  @Post('approvals/:id/decide')
  async decideApproval(
    @Req() req: AdminRequest,
    @Param('id') id: string,
    @Body() dto: DecideApprovalDto
  ) {
    return this.approvalService.decideRequest({
      request_id: id,
      approver_id: req.adminUser!.id,
      decision: dto.decision,
      reason: dto.reason,
      step_up_token: dto.step_up_token,
    });
  }

  // ==========================================
  // 3. IMMUTABLE AUDIT TRAIL
  // ==========================================

  @RequirePermission('audit:view')
  @Get('audit-logs')
  async getAuditLogs(
    @Query('actor_admin_id') actorAdminId?: string,
    @Query('action') action?: string,
    @Query('resource_type') resourceType?: string,
    @Query('outcome') outcome?: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0
  ) {
    return this.auditService.queryAuditLogs({
      actor_admin_id: actorAdminId,
      action,
      resource_type: resourceType,
      outcome,
      limit: Math.min(Number(limit) || 50, 100),
      offset: Number(offset) || 0,
    });
  }

  @RequirePermission('audit:verify')
  @Get('audit-logs/verify-chain')
  async verifyAuditChain() {
    return this.auditService.verifyAuditChain();
  }

  @RequirePermission('audit:export')
  @Post('audit-logs/export-worm')
  async exportToWorm(@Req() req: AdminRequest) {
    const receipt = await this.auditService.exportAuditBatchToWorm();
    return { success: true, receipt };
  }

  // ==========================================
  // 4. JIT ELEVATION & BREAK-GLASS
  // ==========================================

  @RequirePermission('elevation:request')
  @Post('elevation/jit')
  async requestJitElevation(@Req() req: AdminRequest, @Body() dto: JitElevationDto) {
    return this.elevationService.requestJitElevation({
      adminId: req.adminUser!.id,
      roleId: dto.roleId,
      permissionId: dto.permissionId,
      reason: dto.reason,
      ticketRef: dto.ticketRef,
      durationMinutes: dto.durationMinutes || 60,
    });
  }

  @RequirePermission('elevation:break_glass')
  @Post('elevation/break-glass')
  async activateBreakGlass(@Req() req: AdminRequest, @Body() dto: BreakGlassDto) {
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    return this.elevationService.activateBreakGlass({
      adminId: req.adminUser!.id,
      roleId: dto.roleId,
      permissionId: dto.permissionId,
      reason: dto.reason,
      ticketRef: dto.ticketRef,
      durationMinutes: dto.durationMinutes,
      clientIp,
      userAgent,
    });
  }

  @RequirePermission('elevation:view')
  @Get('elevation/active')
  async getActiveElevations() {
    return this.elevationService.getActiveGrants();
  }

  @RequirePermission('elevation:revoke')
  @Post('elevation/:id/revoke')
  async revokeElevation(
    @Req() req: AdminRequest,
    @Param('id') id: string,
    @Body('reason') reason: string
  ) {
    await this.elevationService.revokeGrant(id, req.adminUser!.id, reason || 'Revoked by admin');
    return { success: true, message: 'Elevated access grant revoked.' };
  }

  // ==========================================
  // 5. ACCESS REVIEW (JOINER/MOVER/LEAVER)
  // ==========================================

  @RequirePermission('access_review:view')
  @Get('access-review')
  async getAccessReviewReport() {
    return this.accessReviewService.getAccessReviewReport();
  }

  @RequirePermission('access_review:attest')
  @Post('access-review/:id/attest')
  async attestAccess(
    @Req() req: AdminRequest,
    @Param('id') adminId: string,
    @Body('notes') notes?: string
  ) {
    await this.accessReviewService.attestAdminAccess(adminId, req.adminUser!.id, notes);
    return { success: true, message: 'Admin access reviewed and attested.' };
  }

  @RequirePermission('access_review:attest')
  @Post('access-review/role/:assignmentId/revoke')
  async revokeRoleFromReview(
    @Req() req: AdminRequest,
    @Param('assignmentId') assignmentId: string,
    @Body('reason') reason: string
  ) {
    await this.accessReviewService.revokeRoleAssignment(assignmentId, req.adminUser!.id, reason);
    return { success: true, message: 'Role assignment revoked.' };
  }

  @RequirePermission('admin:offboard')
  @Post('users/:id/offboard')
  async offboardUser(
    @Req() req: AdminRequest,
    @Param('id') adminId: string,
    @Body('reason') reason: string
  ) {
    await this.accessReviewService.offboardAdmin(adminId, req.adminUser!.id, reason);
    return { success: true, message: 'Admin successfully offboarded and all privileges revoked.' };
  }

  // ==========================================
  // 6. GLOBAL INCIDENT KILL SWITCHES
  // ==========================================

  @RequirePermission('kill_switch:view')
  @Get('kill-switches')
  async listKillSwitches() {
    return this.killSwitchService.getAllKillSwitches();
  }

  @RequirePermission('kill_switch:manage')
  @Post('kill-switches/:key/toggle')
  async toggleKillSwitch(
    @Req() req: AdminRequest,
    @Param('key') key: string,
    @Body() dto: ToggleKillSwitchDto
  ) {
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    return this.killSwitchService.toggleKillSwitch({
      key,
      enabled: dto.enabled,
      adminId: req.adminUser!.id,
      reason: dto.reason,
      clientIp,
      userAgent,
    });
  }

  // ==========================================
  // 7. SECURITY & PII REVEAL
  // ==========================================

  @RequirePermission('pii:reveal')
  @Post('security/pii-reveal')
  async revealPii(@Req() req: AdminRequest, @Body() dto: RevealPiiDto) {
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    return this.piiRevealService.revealPii({
      adminId: req.adminUser!.id,
      resourceType: dto.resourceType,
      resourceId: dto.resourceId,
      fieldName: dto.fieldName,
      encryptedData: dto.encryptedData,
      reason: dto.reason,
      stepUpToken: dto.stepUpToken,
      clientIp,
      userAgent,
    });
  }

  @RequirePermission('customer:impersonate')
  @Post('security/impersonate')
  async impersonateCustomer(@Req() req: AdminRequest, @Body() dto: ImpersonateCustomerDto) {
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    return this.impersonationService.startImpersonationSession({
      adminId: req.adminUser!.id,
      customerId: dto.customerId,
      reason: dto.reason,
      ticketRef: dto.ticketRef,
      clientIp,
      userAgent,
    });
  }

  // ==========================================
  // 8. ADMIN USER & ROLE MANAGEMENT
  // ==========================================

  @RequirePermission('admin:create')
  @Get('users')
  async listAdminUsers() {
    const res = await this.db.query(
      `SELECT au.id, au.email, au.full_name, au.status, au.mfa_enrolled, au.requires_passkey,
              au.last_review_at, au.created_at,
              COALESCE(json_agg(json_build_object('id', r.id, 'name', r.name, 'slug', r.slug)) FILTER (WHERE r.id IS NOT NULL), '[]') as roles
       FROM public.admin_users au
       LEFT JOIN public.admin_role_assignments ara ON ara.admin_id = au.id
       LEFT JOIN public.roles r ON r.id = ara.role_id
       GROUP BY au.id
       ORDER BY au.created_at DESC`
    );
    return res.rows;
  }

  @RequirePermission('role:assign')
  @Get('roles')
  async listRoles() {
    const res = await this.db.query(
      `SELECT r.*,
              COALESCE(json_agg(json_build_object('resource', p.resource, 'action', p.action, 'description', p.description)) FILTER (WHERE p.id IS NOT NULL), '[]') as permissions
       FROM public.roles r
       LEFT JOIN public.role_permissions rp ON rp.role_id = r.id
       LEFT JOIN public.permissions p ON p.id = rp.permission_id
       GROUP BY r.id
       ORDER BY r.name ASC`
    );
    return res.rows;
  }
}
