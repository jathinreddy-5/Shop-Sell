import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { Payout } from '@shop-sell/shared';

@Injectable()
export class PayoutsService {
  constructor(private readonly db: DatabaseService) {}

  async getStorePayouts(storeId: string): Promise<{
    payouts: Payout[];
    pendingBalance: number;
    totalPaid: number;
  }> {
    const payoutsRes = await this.db.query<Payout>(
      `SELECT * FROM public.payouts
       WHERE store_id = $1
       ORDER BY created_at DESC`,
      [storeId]
    );

    // Calculate pending store balance from fulfilled order items that have not yet been paid out
    const balanceRes = await this.db.query<{ pending_total: string }>(
      `SELECT COALESCE(SUM(oi.qty * oi.unit_price), 0) as pending_total
       FROM public.order_items oi
       JOIN public.orders o ON oi.order_id = o.id
       WHERE oi.store_id = $1
         AND oi.fulfilment_status = 'fulfilled'
         AND o.payment_status = 'captured'`,
      [storeId]
    );

    const paidTotalRes = await this.db.query<{ paid_total: string }>(
      `SELECT COALESCE(SUM(amount), 0) as paid_total
       FROM public.payouts
       WHERE store_id = $1 AND status = 'paid'`,
      [storeId]
    );

    const lifetimeEarned = parseFloat(balanceRes.rows[0]?.pending_total || '0');
    const totalPaid = parseFloat(paidTotalRes.rows[0]?.paid_total || '0');
    const pendingBalance = Math.max(0, lifetimeEarned - totalPaid);

    return {
      payouts: payoutsRes.rows,
      pendingBalance,
      totalPaid,
    };
  }

  async generatePayoutBatch(adminId: string): Promise<{
    processedCount: number;
    totalAmount: number;
    batchId: string;
  }> {
    // Find stores with eligible balances >= 1000 INR
    const eligibleStores = await this.db.query<{
      store_id: string;
      eligible_amount: string;
    }>(
      `SELECT oi.store_id, COALESCE(SUM(oi.qty * oi.unit_price), 0) as eligible_amount
       FROM public.order_items oi
       JOIN public.orders o ON oi.order_id = o.id
       WHERE oi.fulfilment_status = 'fulfilled'
         AND o.payment_status = 'captured'
       GROUP BY oi.store_id
       HAVING COALESCE(SUM(oi.qty * oi.unit_price), 0) >= 1000`
    );

    const batchId = `batch_${Date.now()}`;
    let processedCount = 0;
    let totalAmount = 0;
    const now = new Date().toISOString();

    for (const store of eligibleStores.rows) {
      const amount = parseFloat(store.eligible_amount);
      if (amount <= 0) continue;

      await this.db.query(
        `INSERT INTO public.payouts (
          store_id, amount, status, period_start, period_end, created_at
        ) VALUES ($1, $2, 'processing', $3, $4, $5)`,
        [store.store_id, amount, now, now, now]
      );

      processedCount++;
      totalAmount += amount;
    }

    // Write audit log entry
    try {
      await this.db.query(
        `INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
         VALUES ($1, 'payout_batch_generated', 'payout_batch', $2, $3)`,
        [
          adminId,
          batchId,
          JSON.stringify({ processedCount, totalAmount }),
        ]
      );
    } catch {}

    return {
      processedCount,
      totalAmount,
      batchId,
    };
  }

  async updatePayoutStatus(
    payoutId: string,
    status: 'pending' | 'processing' | 'paid' | 'failed',
    adminId?: string
  ): Promise<Payout> {
    const res = await this.db.query<Payout>(
      `UPDATE public.payouts
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, payoutId]
    );

    if (res.rows.length === 0) {
      throw new BadRequestException('Payout record not found');
    }

    try {
      await this.db.query(
        `INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
         VALUES ($1, $2, 'payout', $3, $4)`,
        [
          adminId || null,
          `payout_status_${status}`,
          payoutId,
          JSON.stringify({ status }),
        ]
      );
    } catch {}

    return res.rows[0];
  }
}
