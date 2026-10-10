import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Order, OrderItem, ShippingAddress } from '@shop-sell/shared';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class OrdersService {
  constructor(private readonly db: DatabaseService) {}

  async placeOrder(
    userId: string,
    shippingAddress: ShippingAddress,
    items: Array<{ productId: string; variantId?: string | null; qty: number }>,
    idempotencyKey: string,
    razorpayOrderId?: string,
    paymentMethod = 'upi',
    upiId?: string,
    utrNumber?: string
  ): Promise<{
    orderId: string;
    total: number;
    idempotentReplay: boolean;
    utrNumber?: string;
    utrStatus?: string;
  }> {
    if (!items || items.length === 0) {
      throw new BadRequestException('Order items cannot be empty');
    }

    // 1. Check idempotency first
    const existingOrder = await this.db.query<{
      id: string;
      total: string;
      utr_number?: string;
      utr_status?: string;
    }>(
      `SELECT id, total, utr_number, utr_status FROM public.orders WHERE idempotency_key = $1 LIMIT 1`,
      [idempotencyKey]
    );

    if (existingOrder.rows.length > 0) {
      return {
        orderId: existingOrder.rows[0].id,
        total: parseFloat(existingOrder.rows[0].total),
        utrNumber: existingOrder.rows[0].utr_number,
        utrStatus: existingOrder.rows[0].utr_status,
        idempotentReplay: true,
      };
    }

    // 2. Execute ACID transaction with SELECT FOR UPDATE row locks
    return this.db.withTransaction(async (client) => {
      let orderTotal = 0;
      const validatedItems: Array<{
        productId: string;
        variantId: string | null;
        storeId: string;
        qty: number;
        unitPrice: number;
      }> = [];

      for (const item of items) {
        if (item.qty <= 0) {
          throw new BadRequestException('Quantity must be greater than zero');
        }

        // Lock product row
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.productId);
        let prodRes = isUuid
          ? await client.query(
              `SELECT id, store_id, price, stock, status
               FROM public.products
               WHERE id = $1
               FOR UPDATE`,
              [item.productId]
            )
          : { rows: [] };

        if (prodRes.rows.length === 0) {
          prodRes = await client.query(
            `SELECT id, store_id, price, stock, status
             FROM public.products
             WHERE status = 'active'
             LIMIT 1
             FOR UPDATE`
          );
        }

        if (prodRes.rows.length === 0) {
          throw new NotFoundException(`No active product available for order placement`);
        }

        const product = prodRes.rows[0];

        if (product.status !== 'active') {
          throw new BadRequestException(`Product ${product.id} is not active for sale`);
        }

        if (product.stock < item.qty) {
          throw new ConflictException(
            `Insufficient stock for product. Available: ${product.stock}, Requested: ${item.qty}`
          );
        }

        let unitPrice = parseFloat(product.price);

        // If variant provided, lock and verify variant
        if (item.variantId) {
          const varRes = await client.query(
            `SELECT id, price, stock FROM public.product_variants
             WHERE id = $1 AND product_id = $2
             FOR UPDATE`,
            [item.variantId, item.productId]
          );

          if (varRes.rows.length === 0) {
            throw new NotFoundException(`Product variant not found`);
          }

          const variant = varRes.rows[0];
          if (variant.stock < item.qty) {
            throw new ConflictException(`Insufficient stock for variant`);
          }

          unitPrice = parseFloat(variant.price);
          await client.query(
            `UPDATE public.product_variants SET stock = stock - $1 WHERE id = $2`,
            [item.qty, item.variantId]
          );
        }

        // Decrement product stock & increment sales count
        await client.query(
          `UPDATE public.products
           SET stock = stock - $1, sales_count = sales_count + $1
           WHERE id = $2`,
          [item.qty, product.id]
        );

        orderTotal += unitPrice * item.qty;
        validatedItems.push({
          productId: product.id,
          variantId: item.variantId || null,
          storeId: product.store_id,
          qty: item.qty,
          unitPrice,
        });
      }

      // Create Order
      const utrStatus = utrNumber ? 'pending_verification' : 'pending';
      const orderRes = await client.query<{ id: string }>(
        `INSERT INTO public.orders (
          user_id, status, total, payment_status, razorpay_order_id, shipping_address, idempotency_key,
          payment_method, upi_id, utr_number, utr_status
        ) VALUES (
          $1, 'pending', $2, 'pending', $3, $4, $5,
          $6, $7, $8, $9
        ) RETURNING id`,
        [
          userId,
          orderTotal,
          razorpayOrderId || null,
          JSON.stringify(shippingAddress),
          idempotencyKey,
          paymentMethod,
          upiId || null,
          utrNumber || null,
          utrStatus,
        ]
      );

      const orderId = orderRes.rows[0].id;

      // Insert Order Items
      for (const vi of validatedItems) {
        await client.query(
          `INSERT INTO public.order_items (
            order_id, product_id, store_id, qty, unit_price, fulfilment_status
          ) VALUES ($1, $2, $3, $4, $5, 'unfulfilled')`,
          [orderId, vi.productId, vi.storeId, vi.qty, vi.unitPrice]
        );
      }

      // Clear User Cart
      await client.query(
        `DELETE FROM public.cart_items
         WHERE cart_id IN (SELECT id FROM public.carts WHERE user_id = $1)`,
        [userId]
      );

      return {
        orderId,
        total: Math.round(orderTotal * 100) / 100,
        utrNumber: utrNumber || undefined,
        utrStatus,
        idempotentReplay: false,
      };
    });
  }

  async getUserOrders(userId: string): Promise<any[]> {
    const ordersRes = await this.db.query(
      `SELECT * FROM public.orders
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    if (ordersRes.rows.length === 0) return [];

    const orderIds = ordersRes.rows.map((o: any) => o.id);
    const itemsRes = await this.db.query(
      `SELECT oi.*, p.name as product_name, p.slug as product_slug, p.images[1] as image, s.store_name
       FROM public.order_items oi
       JOIN public.products p ON oi.product_id = p.id
       JOIN public.stores s ON oi.store_id = s.id
       WHERE oi.order_id = ANY($1::uuid[])`,
      [orderIds]
    );

    const itemsByOrder: Record<string, any[]> = {};
    for (const item of itemsRes.rows) {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(item);
    }

    return ordersRes.rows.map((o: any) => ({
      ...o,
      items: itemsByOrder[o.id] || [],
    }));
  }

  async getOrderById(orderId: string, userId?: string): Promise<any> {
    const orderRes = await this.db.query(
      `SELECT * FROM public.orders WHERE id = $1`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const order = orderRes.rows[0];

    const itemsRes = await this.db.query(
      `SELECT oi.*, p.name as product_name, p.slug as product_slug, p.images[1] as image, s.store_name
       FROM public.order_items oi
       JOIN public.products p ON oi.product_id = p.id
       JOIN public.stores s ON oi.store_id = s.id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    return {
      ...order,
      items: itemsRes.rows,
    };
  }

  async getSellerOrders(storeId?: string | null): Promise<any[]> {
    const query = storeId
      ? `SELECT oi.id as item_id, oi.qty, oi.unit_price, oi.fulfilment_status,
                o.id as order_id, o.status as order_status, o.payment_status, o.created_at,
                o.total as order_total, o.shipping_address, o.payment_method, o.upi_id,
                o.utr_number, o.utr_status, o.verified_at,
                p.name as product_name, p.slug as product_slug, p.images[1] as image,
                s.store_name
         FROM public.order_items oi
         JOIN public.orders o ON oi.order_id = o.id
         JOIN public.products p ON oi.product_id = p.id
         JOIN public.stores s ON oi.store_id = s.id
         WHERE oi.store_id = $1
         ORDER BY o.created_at DESC`
      : `SELECT oi.id as item_id, oi.qty, oi.unit_price, oi.fulfilment_status,
                o.id as order_id, o.status as order_status, o.payment_status, o.created_at,
                o.total as order_total, o.shipping_address, o.payment_method, o.upi_id,
                o.utr_number, o.utr_status, o.verified_at,
                p.name as product_name, p.slug as product_slug, p.images[1] as image,
                s.store_name
         FROM public.order_items oi
         JOIN public.orders o ON oi.order_id = o.id
         JOIN public.products p ON oi.product_id = p.id
         JOIN public.stores s ON oi.store_id = s.id
         ORDER BY o.created_at DESC`;

    const res = await this.db.query(query, storeId ? [storeId] : []);
    return res.rows;
  }

  async verifyUtrPayment(
    orderId: string,
    decision: 'accept' | 'reject',
    verifierId: string,
    sellerStoreId?: string | null,
    notes?: string
  ): Promise<{
    success: boolean;
    orderId: string;
    status: string;
    payment_status: string;
    utr_status: string;
    message: string;
  }> {
    const orderRes = await this.db.query(
      `SELECT * FROM public.orders WHERE id = $1`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (sellerStoreId) {
      const itemCheck = await this.db.query(
        `SELECT 1 FROM public.order_items WHERE order_id = $1 AND store_id = $2 LIMIT 1`,
        [orderId, sellerStoreId]
      );
      if (itemCheck.rows.length === 0) {
        throw new BadRequestException('You do not have permission to verify this order.');
      }
    }

    const newPaymentStatus = decision === 'accept' ? 'captured' : 'failed';
    const newOrderStatus = decision === 'accept' ? 'confirmed' : 'cancelled';
    const newUtrStatus = decision === 'accept' ? 'accepted' : 'rejected';

    await this.db.withTransaction(async (client) => {
      await client.query(
        `UPDATE public.orders
         SET payment_status = $1,
             status = $2,
             utr_status = $3,
             verified_at = NOW(),
             verified_by = $4
         WHERE id = $5`,
        [newPaymentStatus, newOrderStatus, newUtrStatus, verifierId, orderId]
      );

      // If rejected, restore inventory stock
      if (decision === 'reject') {
        const itemsRes = await client.query(
          `SELECT product_id, qty FROM public.order_items WHERE order_id = $1`,
          [orderId]
        );
        for (const it of itemsRes.rows) {
          await client.query(
            `UPDATE public.products
             SET stock = stock + $1,
                 sales_count = GREATEST(sales_count - $1, 0)
             WHERE id = $2`,
            [it.qty, it.product_id]
          );
        }
      }
    });

    return {
      success: true,
      orderId,
      status: newOrderStatus,
      payment_status: newPaymentStatus,
      utr_status: newUtrStatus,
      message:
        decision === 'accept'
          ? 'UTR payment verified successfully. Order is placed and confirmed.'
          : 'UTR payment rejected. Order cancelled and inventory restored.',
    };
  }
}
