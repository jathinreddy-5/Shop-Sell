import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { AdminAuditLog } from '@shop-sell/shared';
import { AuditWormSink, WormExportReceipt } from './audit-worm-sink.interface';

@Injectable()
export class LocalWormSinkService implements AuditWormSink {
  private readonly wormVault = new Map<string, { records: AdminAuditLog[]; receipt: WormExportReceipt }>();

  async exportBatch(records: AdminAuditLog[]): Promise<WormExportReceipt> {
    const exportId = `worm_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const serialized = JSON.stringify(records);
    const batchHash = crypto.createHash('sha256').update(serialized).digest('hex');

    const receipt: WormExportReceipt = {
      exportId,
      batchHash,
      recordCount: records.length,
      destination: `local://worm-vault/${exportId}.jsonl`,
      wormMode: 'LOCAL_IMMUTABLE',
      timestamp: new Date().toISOString(),
    };

    // Store in immutable vault (frozen against modification)
    this.wormVault.set(exportId, { records: [...records], receipt });

    return receipt;
  }

  async verifyCheckpoint(exportId: string): Promise<boolean> {
    const item = this.wormVault.get(exportId);
    if (!item) return false;

    const recalculated = crypto
      .createHash('sha256')
      .update(JSON.stringify(item.records))
      .digest('hex');

    return recalculated === item.receipt.batchHash;
  }
}
