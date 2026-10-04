import { Module, Global } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AdminRedisService } from './redis/admin-redis.service';
import { AdminCoreController } from './admin-core.controller';

// RBAC & Auth
import { RbacService } from './rbac/rbac.service';
import { AdminAuthGuard } from './rbac/admin-auth.guard';
import { AdminAuthService } from './auth/admin-auth.service';
import { ElevationService } from './rbac/elevation.service';
import { AccessReviewService } from './rbac/access-review.service';

// Audit
import { AdminAuditService } from './audit/admin-audit.service';
import { AuditInterceptor } from './audit/audit.interceptor';
import { AUDIT_WORM_SINK_TOKEN } from './audit/audit-worm-sink.interface';
import { LocalWormSinkService } from './audit/local-worm-sink.service';
import { ADMIN_ALERT_SINK_TOKEN } from './audit/admin-alert.interface';
import { LocalAlertSinkService } from './audit/local-alert-sink.service';

// Approvals & Incidents
import { ApprovalEngineService } from './approvals/approval-engine.service';
import { KillSwitchService } from './kill-switch/kill-switch.service';

// Security
import { KmsEncryptionService } from './security/kms-encryption.service';
import { PiiRevealService } from './security/pii-reveal.service';
import { CustomerImpersonationService } from './security/customer-impersonation.service';

@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [AdminCoreController],
  providers: [
    AdminRedisService,
    // WORM Sink & Alert Sink (Dev/Mock default, pluggable for S3/SNS)
    {
      provide: AUDIT_WORM_SINK_TOKEN,
      useClass: LocalWormSinkService,
    },
    {
      provide: ADMIN_ALERT_SINK_TOKEN,
      useClass: LocalAlertSinkService,
    },
    // Core Services
    AdminAuditService,
    AuditInterceptor,
    RbacService,
    AdminAuthService,
    AdminAuthGuard,
    ElevationService,
    AccessReviewService,
    ApprovalEngineService,
    KillSwitchService,
    KmsEncryptionService,
    PiiRevealService,
    CustomerImpersonationService,
  ],
  exports: [
    AdminRedisService,
    RbacService,
    AdminAuthService,
    AdminAuthGuard,
    AdminAuditService,
    AuditInterceptor,
    ElevationService,
    AccessReviewService,
    ApprovalEngineService,
    KillSwitchService,
    KmsEncryptionService,
    PiiRevealService,
    CustomerImpersonationService,
  ],
})
export class AdminCoreModule {}
