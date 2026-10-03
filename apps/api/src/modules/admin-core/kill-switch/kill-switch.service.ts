import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { AdminRedisService } from '../redis/admin-redis.service';
import { AdminAuditService } from '../audit/admin-audit.service';
import { ADMIN_ALERT_SINK_TOKEN, AdminAlertSink } from '../audit/admin-alert.interface';
import { AdminKillSwitch } from '@shop-sell/shared';

@Injectable()
export class KillSwitchService {
  private readonly logger = new Logger(KillSwitchService.name);
  private readonly CACHE_TTL_SECONDS = 60; // 1 min hot cache, invalidated instantly on change

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: AdminRedisService,
    private readonly auditService: AdminAuditService,
    @Inject(ADMIN_ALERT_SINK_TOKEN) private readonly alertSink: AdminAlertSink,
  ) {}

  private getCacheKey(key: string): string {
    return `admin:kill_switch:${key}`;
  }

  /**
   * Fast server-side check to see if an incident kill switch is active.
   */
  async isKillSwitchActive(key: string): Promise<boolean> {
    const cacheKey = this.getCacheKey(key);
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached !== null) {
        return cached === '1';
      }
    } catch (err) {
      this.logger.warn(`Redis get failed for kill switch ${key}: ${err}`);
    }

    const res = await this.db.query<{ enabled: boolean }>(
      `SELECT enabled FROM public.admin_kill_switches WHERE key = $1`,
      [key]
    );

    const isEnabled = res.rows.length > 0 ? res.rows[0].enabled : false;

    try {
      await this.redis.set(cacheKey, isEnabled ? '1' : '0', this.CACHE_TTL_SECONDS);
    } catch (err) {
      this.logger.warn(`Redis set failed for kill switch ${key}: ${err}`);
    }

    return isEnabled;
  }

  /**
   * Asserts that a kill switch is NOT enabled; throws ForbiddenException if active.
   * Used in payout executor, seller registration, refund issuance, merchandising publish.
   */
  async assertKillSwitchInactive(key: string, operationName: string): Promise<void> {
    const isActive = await this.isKillSwitchActive(key);
    if (isActive) {
      throw new ForbiddenException(
        `Operation halted: Global kill switch '${key}' is currently active for ${operationName}.`
      );
    }
  }

  /**
   * Toggles a global kill switch state.
   * Requires non-empty reason, immediately purges Redis cache, emits immutable audit log,
   * and dispatches critical alert if switch is being engaged.
   */
  async toggleKillSwitch(params: {
    key: string;
    enabled: boolean;
    adminId: string;
    reason: string;
    clientIp?: string;
    userAgent?: string;
  }): Promise<AdminKillSwitch> {
    if (!params.reason || params.reason.trim().length < 10) {
      throw new BadRequestException('A detailed reason (minimum 10 characters) is required to toggle kill switch.');
    }

    const res = await this.db.query<AdminKillSwitch>(
      `UPDATE public.admin_kill_switches
       SET enabled = $1, reason = $2, updated_by = $3, updated_at = NOW()
       WHERE key = $4
       RETURNING *`,
      [params.enabled, params.reason, params.adminId, params.key]
    );

    if (res.rows.length === 0) {
      throw new BadRequestException(`Kill switch key '${params.key}' not found.`);
    }

    const killSwitch = res.rows[0];

    // Invalidate cache immediately
    const cacheKey = this.getCacheKey(params.key);
    try {
      await this.redis.set(cacheKey, params.enabled ? '1' : '0', this.CACHE_TTL_SECONDS);
    } catch (err) {
      this.logger.warn(`Redis update failed for kill switch ${params.key}: ${err}`);
    }

    // Audit event
    await this.auditService.logEvent({
      actor_admin_id: params.adminId,
      actor_role_at_time: 'super_admin',
      action: params.enabled ? 'kill_switch:engaged' : 'kill_switch:disengaged',
      resource_type: 'kill_switch',
      resource_id: params.key,
      outcome: 'success',
      reason: params.reason,
      after_state: {
        key: params.key,
        enabled: params.enabled,
      },
      ip_address: params.clientIp,
      user_agent: params.userAgent,
    });

    // Alert if engaged
    if (params.enabled) {
      await this.alertSink.dispatchAlert({
        alertType: 'KILL_SWITCH_TRIGGERED',
        severity: 'CRITICAL',
        title: `INCIDENT CONTROL: Kill Switch Engaged [${params.key}]`,
        description: `Admin ${params.adminId} engaged kill switch '${params.key}'. Reason: "${params.reason}". Affected services are immediately halted.`,
        actorAdminId: params.adminId,
        metadata: {
          key: params.key,
          reason: params.reason,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return killSwitch;
  }

  /**
   * Retrieves all kill switches and their statuses.
   */
  async getAllKillSwitches(): Promise<AdminKillSwitch[]> {
    const res = await this.db.query<AdminKillSwitch>(
      `SELECT * FROM public.admin_kill_switches ORDER BY key ASC`
    );
    return res.rows;
  }
}
