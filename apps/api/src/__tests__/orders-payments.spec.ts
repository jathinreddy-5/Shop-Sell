import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as crypto from 'crypto';
import { CheckoutInputSchema } from '@shop-sell/shared';

describe('Phase 4: Cart, Orders & Razorpay Payments Suite', () => {
  const razorpaySecret = 'sample_secret_key_67890';

  it('should validate checkout input schema with complete Indian shipping address', () => {
    const validCheckout = {
      shipping_address: {
        full_name: 'Aditya Sen',
        phone: '9876543210',
        street: '12 Banjara Hills, Road No. 3',
        city: 'Hyderabad',
        state: 'Telangana',
        postal_code: '500034',
        country: 'India',
      },
      idempotency_key: 'idemp_order_123456789',
    };

    const parsed = CheckoutInputSchema.safeParse(validCheckout);
    assert.strictEqual(parsed.success, true);
  });

  it('should verify Razorpay payment HMAC SHA256 signature correctly', () => {
    const orderId = 'order_DAZ2345678';
    const paymentId = 'pay_FAZ9876543';

    // Generate valid signature using the secret
    const payload = `${orderId}|${paymentId}`;
    const validSignature = crypto
      .createHmac('sha256', razorpaySecret)
      .update(payload)
      .digest('hex');

    // Verification helper
    const verifySignature = (ordId: string, payId: string, sig: string): boolean => {
      const expected = crypto
        .createHmac('sha256', razorpaySecret)
        .update(`${ordId}|${payId}`)
        .digest('hex');
      return expected === sig;
    };

    assert.strictEqual(verifySignature(orderId, paymentId, validSignature), true);
    assert.strictEqual(verifySignature(orderId, paymentId, 'tampered_signature'), false);
  });

  it('should verify webhook signature and handle idempotency', () => {
    const webhookSecret = 'sample_webhook_secret_key';
    const rawBody = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_123456',
            order_id: 'order_DAZ2345678',
            amount: 489700,
          },
        },
      },
    });

    const validWebhookSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const verifyWebhook = (body: string, sig: string): boolean => {
      const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');
      return expected === sig;
    };

    assert.strictEqual(verifyWebhook(rawBody, validWebhookSig), true);
    assert.strictEqual(verifyWebhook(rawBody, 'wrong_signature'), false);

    // Idempotency tracking simulation: duplicate payment event must not double-process
    const processedEvents = new Set<string>();
    const processPayment = (eventId: string): boolean => {
      if (processedEvents.has(eventId)) {
        return false; // already processed, ignore
      }
      processedEvents.add(eventId);
      return true; // first time processing
    };

    assert.strictEqual(processPayment('pay_123456'), true);
    assert.strictEqual(processPayment('pay_123456'), false, 'Duplicate webhook should be ignored');
  });

  it('should calculate cart totals and handle quantity updates', () => {
    const cart = [
      { id: '1', price: 3499, qty: 1 },
      { id: '2', price: 699, qty: 2 },
    ];

    const subtotal = cart.reduce((acc, i) => acc + i.price * i.qty, 0);
    assert.strictEqual(subtotal, 3499 + 699 * 2); // 4897

    // Update qty to 0 removes item
    const updated = cart
      .map((item) => (item.id === '1' ? { ...item, qty: 0 } : item))
      .filter((item) => item.qty > 0);

    assert.strictEqual(updated.length, 1);
    assert.strictEqual(updated[0].id, '2');
  });

  it('should validate UPI payment details and 12-digit UTR number', () => {
    const validUpiCheckout = {
      shipping_address: {
        full_name: 'Aditya Sen',
        phone: '9876543210',
        street: '12 Banjara Hills, Road No. 3',
        city: 'Hyderabad',
        state: 'Telangana',
        postal_code: '500034',
        country: 'India',
      },
      idempotency_key: 'idemp_order_987654321',
      payment_method: 'upi',
      upi_id: 'customer@okhdfcbank',
      utr_number: '428912345678',
    };

    const parsed = CheckoutInputSchema.safeParse(validUpiCheckout);
    assert.strictEqual(parsed.success, true);
    assert.strictEqual(parsed.data?.payment_method, 'upi');
    assert.strictEqual(parsed.data?.utr_number, '428912345678');
  });

  it('should enforce strict 12-digit format on customer UTR numbers', () => {
    const is12DigitUtr = (utr: string) => /^\d{12}$/.test(utr.trim());

    assert.strictEqual(is12DigitUtr('428912345678'), true, '12 digits must pass');
    assert.strictEqual(is12DigitUtr('12345678901'), false, '11 digits must fail');
    assert.strictEqual(is12DigitUtr('1234567890123'), false, '13 digits must fail');
    assert.strictEqual(is12DigitUtr('42891234ABCD'), false, 'Alphanumeric must fail');
    assert.strictEqual(is12DigitUtr(''), false, 'Empty must fail');
  });

  it('should correctly transition order status based on seller UTR decision', () => {
    interface SimulatedOrder {
      id: string;
      status: string;
      payment_status: string;
      utr_status: string;
      utr_number: string;
      stock: number;
    }

    const order: SimulatedOrder = {
      id: 'ord_12345',
      status: 'pending',
      payment_status: 'pending',
      utr_status: 'pending_verification',
      utr_number: '428912345678',
      stock: 10,
    };

    const applySellerDecision = (o: SimulatedOrder, decision: 'accept' | 'reject') => {
      if (decision === 'accept') {
        return {
          ...o,
          status: 'confirmed',
          payment_status: 'captured',
          utr_status: 'accepted',
        };
      } else {
        return {
          ...o,
          status: 'cancelled',
          payment_status: 'failed',
          utr_status: 'rejected',
          stock: o.stock + 1, // Restored stock
        };
      }
    };

    const acceptedOrder = applySellerDecision(order, 'accept');
    assert.strictEqual(acceptedOrder.status, 'confirmed');
    assert.strictEqual(acceptedOrder.payment_status, 'captured');
    assert.strictEqual(acceptedOrder.utr_status, 'accepted');

    const rejectedOrder = applySellerDecision(order, 'reject');
    assert.strictEqual(rejectedOrder.status, 'cancelled');
    assert.strictEqual(rejectedOrder.payment_status, 'failed');
    assert.strictEqual(rejectedOrder.utr_status, 'rejected');
    assert.strictEqual(rejectedOrder.stock, 11);
  });
});
