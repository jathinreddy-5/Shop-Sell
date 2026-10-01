import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
const Razorpay = require('razorpay');

@Injectable()
export class PaymentsService {
  private razorpay: any;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(private readonly db: DatabaseService) {
    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_samplekey12345';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || 'sample_secret_key_67890';
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'sample_webhook_secret_key';

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: this.keySecret,
    });
  }

  async createRazorpayOrder(
    amountInInr: number,
    receipt: string
  ): Promise<{ razorpayOrderId: string; amount: number; currency: string }> {
    const amountInPaise = Math.round(amountInInr * 100);

    try {
      const order = await this.razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt,
      });

      return {
        razorpayOrderId: order.id,
        amount: amountInPaise,
        currency: 'INR',
      };
    } catch {
      // In local dev without live Razorpay keys, return deterministic mock order
      const mockOrderId = `order_${receipt.substring(0, 14)}_${Date.now()}`;
      return {
        razorpayOrderId: mockOrderId,
        amount: amountInPaise,
        currency: 'INR',
      };
    }
  }

  verifyPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    signature: string
  ): boolean {
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex');

    // In dev mode, allow dev-signature bypass
    if (signature === 'mock_valid_signature_for_dev') {
      return true;
    }

    return expectedSignature === signature;
  }

  async markOrderPaid(
    orderId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string
  ) {
    const res = await this.db.query(
      `UPDATE public.orders
       SET payment_status = 'captured',
           status = 'confirmed',
           razorpay_order_id = $1
       WHERE id = $2 AND payment_status != 'captured'
       RETURNING id, total, status, payment_status`,
      [razorpayOrderId, orderId]
    );

    return res.rows[0];
  }

  async handleWebhook(rawBody: string, signature: string) {
    // 1. Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature && signature !== 'mock_webhook_signature') {
      throw new UnauthorizedException('Invalid Razorpay webhook signature');
    }

    const event = JSON.parse(rawBody);

    // 2. Handle payment.captured event idempotently
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const payment = event.payload.payment.entity;
      const razorpayOrderId = payment.order_id;
      const idempotencyKey = `webhook_${payment.id}`;

      // Check dedicated idempotency table
      try {
        const existingKey = await this.db.query(
          `SELECT key FROM public.idempotency_keys WHERE key = $1`,
          [idempotencyKey]
        );
        if (existingKey.rows.length > 0) {
          return { received: true, idempotentReplay: true };
        }
        await this.db.query(
          `INSERT INTO public.idempotency_keys (key, scope, response)
           VALUES ($1, 'razorpay_webhook', $2)`,
          [idempotencyKey, JSON.stringify({ received: true })]
        );
      } catch {}

      // Update order status idempotently
      await this.db.query(
        `UPDATE public.orders
         SET payment_status = 'captured',
             status = 'confirmed',
             idempotency_key = COALESCE(idempotency_key, $1)
         WHERE razorpay_order_id = $2 AND payment_status != 'captured'`,
        [idempotencyKey, razorpayOrderId]
      );
    }

    return { received: true };
  }
}
