import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class CartService {
  constructor(private readonly db: DatabaseService) {}

  async getOrCreateCart(userId?: string, anonymousId?: string): Promise<{ id: string }> {
    if (userId) {
      const existing = await this.db.query<{ id: string }>(
        `SELECT id FROM public.carts WHERE user_id = $1 LIMIT 1`,
        [userId]
      );
      if (existing.rows.length > 0) return existing.rows[0];

      const created = await this.db.query<{ id: string }>(
        `INSERT INTO public.carts (user_id) VALUES ($1) RETURNING id`,
        [userId]
      );
      return created.rows[0];
    }

    if (anonymousId) {
      const existing = await this.db.query<{ id: string }>(
        `SELECT id FROM public.carts WHERE anonymous_id = $1 LIMIT 1`,
        [anonymousId]
      );
      if (existing.rows.length > 0) return existing.rows[0];

      const created = await this.db.query<{ id: string }>(
        `INSERT INTO public.carts (anonymous_id) VALUES ($1) RETURNING id`,
        [anonymousId]
      );
      return created.rows[0];
    }

    const created = await this.db.query<{ id: string }>(
      `INSERT INTO public.carts DEFAULT VALUES RETURNING id`
    );
    return created.rows[0];
  }

  async getCartDetails(cartId: string) {
    const itemsRes = await this.db.query(
      `SELECT ci.id, ci.product_id, ci.variant_id, ci.qty, ci.created_at,
              p.name as product_name, p.slug as product_slug, p.price, p.compare_at_price,
              p.stock, p.images[1] as image, s.store_name
       FROM public.cart_items ci
       JOIN public.products p ON ci.product_id = p.id
       JOIN public.stores s ON p.store_id = s.id
       WHERE ci.cart_id = $1
       ORDER BY ci.created_at ASC`,
      [cartId]
    );

    const items = itemsRes.rows;
    const subtotal = items.reduce(
      (acc: number, item: any) => acc + parseFloat(item.price) * item.qty,
      0
    );

    return {
      cartId,
      items,
      itemCount: items.reduce((acc: number, item: any) => acc + item.qty, 0),
      subtotal: Math.round(subtotal * 100) / 100,
    };
  }

  async addItem(cartId: string, productId: string, qty: number, variantId?: string) {
    // Check product exists and active
    const prodRes = await this.db.query(
      `SELECT id, stock, status FROM public.products WHERE id = $1`,
      [productId]
    );
    if (prodRes.rows.length === 0 || prodRes.rows[0].status !== 'active') {
      throw new NotFoundException('Product not found or not active');
    }

    const res = await this.db.query(
      `INSERT INTO public.cart_items (cart_id, product_id, variant_id, qty)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (cart_id, product_id, variant_id)
       DO UPDATE SET qty = public.cart_items.qty + EXCLUDED.qty
       RETURNING *`,
      [cartId, productId, variantId || null, qty]
    );

    return res.rows[0];
  }

  async updateItemQty(cartId: string, itemId: string, qty: number) {
    if (qty <= 0) {
      await this.db.query(
        `DELETE FROM public.cart_items WHERE id = $1 AND cart_id = $2`,
        [itemId, cartId]
      );
      return { removed: true };
    }

    const res = await this.db.query(
      `UPDATE public.cart_items
       SET qty = $1
       WHERE id = $2 AND cart_id = $3
       RETURNING *`,
      [qty, itemId, cartId]
    );

    return res.rows[0];
  }

  async removeItem(cartId: string, itemId: string) {
    await this.db.query(
      `DELETE FROM public.cart_items WHERE id = $1 AND cart_id = $2`,
      [itemId, cartId]
    );
    return { success: true };
  }

  async mergeAnonymousCart(userId: string, anonymousId: string) {
    return this.db.withTransaction(async (client) => {
      const anonCart = await client.query<{ id: string }>(
        `SELECT id FROM public.carts WHERE anonymous_id = $1 LIMIT 1`,
        [anonymousId]
      );

      if (anonCart.rows.length === 0) return { merged: false };

      // User's cart
      let userCart = await client.query<{ id: string }>(
        `SELECT id FROM public.carts WHERE user_id = $1 LIMIT 1`,
        [userId]
      );

      if (userCart.rows.length === 0) {
        userCart = await client.query<{ id: string }>(
          `INSERT INTO public.carts (user_id) VALUES ($1) RETURNING id`,
          [userId]
        );
      }

      const userCartId = userCart.rows[0].id;
      const anonCartId = anonCart.rows[0].id;

      // Transfer items
      await client.query(
        `INSERT INTO public.cart_items (cart_id, product_id, variant_id, qty)
         SELECT $1, product_id, variant_id, qty FROM public.cart_items
         WHERE cart_id = $2
         ON CONFLICT (cart_id, product_id, variant_id)
         DO UPDATE SET qty = public.cart_items.qty + EXCLUDED.qty`,
        [userCartId, anonCartId]
      );

      // Remove anon cart
      await client.query(`DELETE FROM public.carts WHERE id = $1`, [anonCartId]);

      return { merged: true, userCartId };
    });
  }
}
