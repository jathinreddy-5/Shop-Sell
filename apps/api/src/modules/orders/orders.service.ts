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
    razorpayOrderId?: string
  ): Promise<{ orderId: string; total: number; idempotentReplay: boolean }> {
    if (!items || items.length === 0) {
      throw new BadRequestException('Order items cannot be empty');
    }

    // 1. Check idempotency first
    const existingOrder = await this.db.query<{ id: string; total: string }>(
      `SELECT id, total FROM public.orders WHERE idempotency_key = $1 LIMIT 1`,
      [idempotencyKey]
    );

    if (existingOrder.rows.length > 0) {
      return {
        orderId: existingOrder.rows[0].id,
        total: parseFloat(existingOrder.rows[0].total),
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
        const prodRes = await client.query(
          `SELECT id, store_id, price, stock, status
           FROM public.products
           WHERE id = $1
           FOR UPDATE`,
          [item.productId]
        );

        if (prodRes.rows.length === 0) {
          throw new NotFoundException(`Product ${item.productId} not found`);
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
          [item.qty, item.productId]
        );

        orderTotal += unitPrice * item.qty;
        validatedItems.push({
          productId: item.productId,
          variantId: item.variantId || null,
          storeId: product.store_id,
          qty: item.qty,
          unitPrice,
        });
      }

      // Create Order
      const orderRes = await client.query<{ id: string }>(
        `INSERT INTO public.orders (
          user_id, status, total, payment_status, razorpay_order_id, shipping_address, idempotency_key
        ) VALUES (
          $1, 'pending', $2, 'pending', $3, $4, $5
        ) RETURNING id`,
        [
          userId,
          orderTotal,
          razorpayOrderId || null,
          JSON.stringify(shippingAddress),
          idempotencyKey,
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
        idempotentReplay: false,
      };
    });
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    const ordersRes = await this.db.query<Order>(
      `SELECT * FROM public.orders
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return ordersRes.rows;
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

  async getSellerOrders(storeId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT oi.id as item_id, oi.qty, oi.unit_price, oi.fulfilment_status,
              o.id as order_id, o.status as order_status, o.payment_status, o.created_at,
              p.name as product_name, p.slug as product_slug, p.images[1] as image
       FROM public.order_items oi
       JOIN public.orders o ON oi.order_id = o.id
       JOIN public.products p ON oi.product_id = p.id
       WHERE oi.store_id = $1
       ORDER BY o.created_at DESC`,
      [storeId]
    );

    return res.rows;
  }
}
