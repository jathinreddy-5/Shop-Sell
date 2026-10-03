import { AdminAuditLog } from '@shop-sell/shared';

export const AUDIT_WORM_SINK_TOKEN = 'AUDIT_WORM_SINK_TOKEN';

export interface WormExportReceipt {
  exportId: string;
  batchHash: string;
  recordCount: number;
  destination: string;
  wormMode: 'LOCAL_IMMUTABLE' | 'S3_OBJECT_LOCK_COMPLIANCE';
  timestamp: string;
}

/**
 * Interface for Write-Once-Read-Many (WORM) storage sinks.
 * Ensures audit trails exported outside the operational database are immune
 * even to database superusers or cloud administrative compromise.
 */
export interface AuditWormSink {
  exportBatch(records: AdminAuditLog[]): Promise<WormExportReceipt>;
  verifyCheckpoint(exportId: string): Promise<boolean>;
}
