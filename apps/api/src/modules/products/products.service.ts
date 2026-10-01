import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Product, ProductVariant } from '@shop-sell/shared';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class ProductsService {
  constructor(private readonly db: DatabaseService) {}

  async getStoreIdForOwner(userId: string): Promise<string> {
    const res = await this.db.query<{ id: string }>(
      `SELECT id FROM public.stores WHERE owner_id = $1 AND status = 'active' LIMIT 1`,
      [userId]
    );

    if (res.rows.length === 0) {
      throw new ForbiddenException(
        'You do not have an active seller store. Apply to become a seller first.'
      );
    }

    return res.rows[0].id;
  }

  async createProduct(
    storeId: string,
    data: {
      name: string;
      slug: string;
      description: string;
      price: number;
      compare_at_price?: number | null;
      currency?: string;
      stock: number;
      category_id: string;
      images: string[];
      attributes?: Record<string, any>;
      status?: 'draft' | 'active' | 'archived';
      variants?: Array<{
        sku: string;
        options: Record<string, string>;
        price: number;
        stock: number;
      }>;
    }
  ): Promise<Product> {
    // 1. Validate category exists
    const catCheck = await this.db.query(
      `SELECT id, attribute_schema FROM public.categories WHERE id = $1`,
      [data.category_id]
    );
    if (catCheck.rows.length === 0) {
      throw new BadRequestException(`Category with ID ${data.category_id} not found`);
    }

    return this.db.withTransaction(async (client) => {
      // 2. Insert product
      const res = await client.query<Product>(
        `INSERT INTO public.products (
          store_id, name, slug, description, price, compare_at_price,
          currency, stock, category_id, images, attributes, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        ) RETURNING *`,
        [
          storeId,
          data.name,
          data.slug,
          data.description,
          data.price,
          data.compare_at_price || null,
          data.currency || 'INR',
          data.stock,
          data.category_id,
          data.images,
          JSON.stringify(data.attributes || {}),
          data.status || 'draft',
        ]
      );

      const product = res.rows[0];

      // 3. Insert variants if provided
      if (data.variants && data.variants.length > 0) {
        for (const v of data.variants) {
          await client.query(
            `INSERT INTO public.product_variants (
              product_id, sku, options, price, stock
            ) VALUES ($1, $2, $3, $4, $5)`,
            [
              product.id,
              v.sku,
              JSON.stringify(v.options),
              v.price,
              v.stock,
            ]
          );
        }
      }

      return product;
    });
  }

  async getSellerProducts(
    storeId: string,
    options: { page?: number; limit?: number; status?: string; search?: string }
  ): Promise<{ products: Product[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(options.page || 1, 1);
    const limit = Math.min(options.limit || 20, 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = ['store_id = $1'];
    const params: any[] = [storeId];
    let paramIndex = 2;

    if (options.status && options.status !== 'all') {
      conditions.push(`status = $${paramIndex++}`);
      params.push(options.status);
    }

    if (options.search) {
      conditions.push(`name ILIKE $${paramIndex++}`);
      params.push(`%${options.search}%`);
    }

    const whereClause = conditions.join(' AND ');

    // Total count query
    const countRes = await this.db.query<{ count: string }>(
      `SELECT count(*) FROM public.products WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    // List query
    const listRes = await this.db.query<Product>(
      `SELECT * FROM public.products
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    return {
      products: listRes.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async updateProduct(
    storeId: string,
    productId: string,
    data: Partial<Product>
  ): Promise<Product> {
    const existing = await this.db.query(
      `SELECT id FROM public.products WHERE id = $1 AND store_id = $2`,
      [productId, storeId]
    );

    if (existing.rows.length === 0) {
      throw new NotFoundException(`Product ${productId} not found in your store`);
    }

    const fields: string[] = [];
    const params: any[] = [productId, storeId];
    let paramIndex = 3;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.price !== undefined) {
      fields.push(`price = $${paramIndex++}`);
      params.push(data.price);
    }
    if (data.stock !== undefined) {
      fields.push(`stock = $${paramIndex++}`);
      params.push(data.stock);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }
    if (data.images !== undefined) {
      fields.push(`images = $${paramIndex++}`);
      params.push(data.images);
    }
    if (data.attributes !== undefined) {
      fields.push(`attributes = $${paramIndex++}`);
      params.push(JSON.stringify(data.attributes));
    }

    if (fields.length === 0) {
      throw new BadRequestException('No fields provided to update');
    }

    const updateQuery = `
      UPDATE public.products
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $1 AND store_id = $2
      RETURNING *
    `;

    const res = await this.db.query<Product>(updateQuery, params);
    return res.rows[0];
  }

  async archiveProduct(storeId: string, productId: string): Promise<Product> {
    return this.updateProduct(storeId, productId, { status: 'archived' });
  }

  async getInventoryAlerts(storeId: string, threshold = 5): Promise<Product[]> {
    const res = await this.db.query<Product>(
      `SELECT id, name, slug, price, stock, images, status
       FROM public.products
       WHERE store_id = $1 AND stock <= $2 AND status != 'archived'
       ORDER BY stock ASC`,
      [storeId, threshold]
    );
    return res.rows;
  }

  async bulkImportCsv(
    storeId: string,
    rows: Array<{
      name: string;
      description: string;
      price: number;
      stock: number;
      category_id: string;
      image_url?: string;
    }>
  ): Promise<{ inserted: number; errors: string[] }> {
    let inserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const slug = `${row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${i}`;
        const images = row.image_url ? [row.image_url] : ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'];

        await this.db.query(
          `INSERT INTO public.products (
            store_id, name, slug, description, price, stock, category_id, images, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')`,
          [
            storeId,
            row.name,
            slug,
            row.description,
            row.price,
            row.stock,
            row.category_id,
            images,
          ]
        );
        inserted++;
      } catch (err: any) {
        errors.push(`Row ${i + 1} (${row.name}): ${err.message}`);
      }
    }

    return { inserted, errors };
  }
}
