import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client } from 'typesense';
import Redis from 'ioredis';
import { DatabaseService } from '../../database/database.service';
import { createRedisClient } from '../../common/redis';

export interface SearchOptions {
  query?: string;
  category?: string;
  storeId?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStockOnly?: boolean;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'popular' | 'newest';
  page?: number;
  limit?: number;
}

export interface AutocompleteResult {
  recentSearches: string[];
  suggestions: string[];
  products: Array<{
    id: string;
    name: string;
    slug: string;
    price: number;
    thumbnail: string;
    category: string;
  }>;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private typesenseClient: Client;
  private redisClient: Redis;
  private readonly collectionName = 'products';

  constructor(private readonly db: DatabaseService) {
    this.typesenseClient = new Client({
      nodes: [
        {
          host: process.env.TYPESENSE_HOST || 'localhost',
          port: parseInt(process.env.TYPESENSE_PORT || '8108', 10),
          protocol: process.env.TYPESENSE_PROTOCOL || 'http',
        },
      ],
      apiKey: process.env.TYPESENSE_API_KEY || 'xyz_typesense_local_dev_key_12345',
      connectionTimeoutSeconds: 2,
    });

    this.redisClient = createRedisClient();
  }

  async onModuleInit() {
    try {
      await this.ensureCollectionExists();
    } catch {
      // Graceful fallback if Typesense is not yet started in dev
    }
  }

  async ensureCollectionExists() {
    try {
      await this.typesenseClient.collections(this.collectionName).retrieve();
    } catch (err: any) {
      if (err.httpStatus === 404 || err.message?.includes('Not Found') || err.name === 'NotFoundError') {
        await this.typesenseClient.collections().create({
          name: this.collectionName,
          fields: [
            { name: 'id', type: 'string' },
            { name: 'name', type: 'string' },
            { name: 'slug', type: 'string' },
            { name: 'description', type: 'string' },
            { name: 'price', type: 'float' },
            { name: 'compare_at_price', type: 'float', optional: true },
            { name: 'stock', type: 'int32' },
            { name: 'category_name', type: 'string', facet: true },
            { name: 'category_slug', type: 'string', facet: true },
            { name: 'store_id', type: 'string', facet: true },
            { name: 'store_name', type: 'string', facet: true },
            { name: 'rating_avg', type: 'float', facet: true },
            { name: 'rating_count', type: 'int32' },
            { name: 'sales_count', type: 'int32' },
            { name: 'view_count', type: 'int32' },
            { name: 'status', type: 'string', facet: true },
            { name: 'image', type: 'string' },
            { name: 'created_at', type: 'int64' },
          ],
        });
        console.log(`[SearchService] Created Typesense collection '${this.collectionName}'`);
      }
    }
  }

  async search(options: SearchOptions) {
    const q = options.query?.trim() || '*';
    const page = Math.max(options.page || 1, 1);
    const limit = Math.min(options.limit || 20, 50);

    // Filter clauses
    const filters: string[] = ['status:=active'];

    if (options.inStockOnly) {
      filters.push('stock:>0');
    }
    if (options.category) {
      filters.push(`category_slug:=${options.category}`);
    }
    if (options.storeId) {
      filters.push(`store_id:=${options.storeId}`);
    }
    if (options.minPrice !== undefined || options.maxPrice !== undefined) {
      const min = options.minPrice ?? 0;
      const max = options.maxPrice ?? 99999999;
      filters.push(`price:[${min}..${max}]`);
    }
    if (options.minRating !== undefined) {
      filters.push(`rating_avg:>=${options.minRating}`);
    }

    // Sort clause
    let sortBy = 'sales_count:desc';
    if (options.sortBy === 'price_asc') sortBy = 'price:asc';
    else if (options.sortBy === 'price_desc') sortBy = 'price:desc';
    else if (options.sortBy === 'rating') sortBy = 'rating_avg:desc';
    else if (options.sortBy === 'newest') sortBy = 'created_at:desc';
    else if (options.sortBy === 'relevance' && q !== '*') sortBy = '_text_match:desc,sales_count:desc';

    try {
      const searchResults = await this.typesenseClient
        .collections(this.collectionName)
        .documents()
        .search({
          q,
          query_by: 'name,description,category_name',
          filter_by: filters.join(' && '),
          sort_by: sortBy,
          page,
          per_page: limit,
          num_typos: 2,
          prefix: true,
          facet_by: 'category_name,category_slug,store_name',
        });

      return {
        found: searchResults.found,
        page,
        totalPages: Math.ceil((searchResults.found || 0) / limit),
        products: (searchResults.hits || []).map((hit: any) => hit.document),
        facets: searchResults.facet_counts || [],
      };
    } catch {
      // Graceful degradation: Fallback to Postgres full-text / ILIKE if Typesense is offline
      return this.searchPostgresFallback(options);
    }
  }

  async autocomplete(query: string, userIdOrAnonId?: string): Promise<AutocompleteResult> {
    const q = query.trim().toLowerCase();

    // 1. Fetch recent searches from Redis for this user/session
    let recentSearches: string[] = [];
    if (userIdOrAnonId) {
      try {
        if (this.redisClient.status === 'ready' || this.redisClient.status === 'connecting') {
          recentSearches = await this.redisClient.zrevrange(
            `recent_searches:${userIdOrAnonId}`,
            0,
            4
          );
        }
      } catch {
        // Redis optional fallback
      }
    }

    if (!q) {
      return {
        recentSearches,
        suggestions: ['earbuds', 'ceramic mug', 'cotton shirt', 'leather shoes', 'coffee beans'],
        products: [],
      };
    }

    // 2. Fetch matches from Typesense or DB fallback
    try {
      const res = await this.typesenseClient
        .collections(this.collectionName)
        .documents()
        .search({
          q,
          query_by: 'name,category_name',
          filter_by: 'status:=active',
          per_page: 5,
          num_typos: 2,
          prefix: true,
        });

      const hits = res.hits || [];
      const suggestions = Array.from(
        new Set(hits.map((h: any) => h.document.name.split(' ').slice(0, 3).join(' ')))
      ).slice(0, 5);

      const products = hits.map((h: any) => ({
        id: h.document.id,
        name: h.document.name,
        slug: h.document.slug,
        price: h.document.price,
        thumbnail: h.document.image,
        category: h.document.category_name,
      }));

      return {
        recentSearches,
        suggestions: suggestions.length > 0 ? suggestions : [q],
        products,
      };
    } catch {
      // Postgres fallback
      return this.autocompletePostgresFallback(q, recentSearches);
    }
  }

  async recordSearchQuery(identifier: string, query: string) {
    if (!identifier || !query.trim()) return;
    const cleanQuery = query.trim().toLowerCase();

    try {
      if (this.redisClient.status === 'ready' || this.redisClient.status === 'connecting') {
        const key = `recent_searches:${identifier}`;
        const timestamp = Date.now();
        await this.redisClient.zadd(key, timestamp, cleanQuery);
        await this.redisClient.zremrangebyrank(key, 0, -51); // keep top 50
        await this.redisClient.expire(key, 90 * 86400); // 90 days TTL
        await this.redisClient.del(`feed:${identifier}`); // invalidate home feed cache
      }
    } catch {
      // Redis offline logging
    }
  }

  async reindexAll(): Promise<{ indexed: number }> {
    const res = await this.db.query(
      `SELECT p.id, p.name, p.slug, p.description, p.price::float, p.compare_at_price::float,
              p.stock, p.rating_avg::float, p.rating_count, p.sales_count, p.view_count,
              p.status, p.images, EXTRACT(epoch FROM p.created_at)::bigint as created_at,
              c.name as category_name, c.slug as category_slug,
              s.id as store_id, s.store_name
       FROM public.products p
       JOIN public.categories c ON p.category_id = c.id
       JOIN public.stores s ON p.store_id = s.id`
    );

    const documents = res.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      price: r.price,
      compare_at_price: r.compare_at_price || undefined,
      stock: r.stock,
      category_name: r.category_name,
      category_slug: r.category_slug,
      store_id: r.store_id,
      store_name: r.store_name,
      rating_avg: r.rating_avg,
      rating_count: r.rating_count,
      sales_count: r.sales_count,
      view_count: r.view_count,
      status: r.status,
      image: r.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
      created_at: r.created_at,
    }));

    if (documents.length > 0) {
      await this.typesenseClient
        .collections(this.collectionName)
        .documents()
        .import(documents, { action: 'upsert' });
    }

    return { indexed: documents.length };
  }

  private async searchPostgresFallback(options: SearchOptions) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = ["p.status = 'active'"];
    const params: any[] = [];
    let paramIndex = 1;

    if (options.query && options.query !== '*') {
      conditions.push(`p.name ILIKE $${paramIndex++}`);
      params.push(`%${options.query}%`);
    }

    if (options.category) {
      conditions.push(`c.slug = $${paramIndex++}`);
      params.push(options.category);
    }

    const where = conditions.join(' AND ');
    const countRes = await this.db.query(
      `SELECT count(*) FROM public.products p JOIN public.categories c ON p.category_id = c.id WHERE ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const listRes = await this.db.query(
      `SELECT p.id, p.name, p.slug, p.description, p.price, p.compare_at_price, p.stock,
              p.rating_avg, p.rating_count, p.sales_count, p.images[1] as image,
              c.name as category_name, c.slug as category_slug, s.store_name
       FROM public.products p
       JOIN public.categories c ON p.category_id = c.id
       JOIN public.stores s ON p.store_id = s.id
       WHERE ${where}
       ORDER BY p.sales_count DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    return {
      found: total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      products: listRes.rows,
      facets: [],
    };
  }

  private async autocompletePostgresFallback(
    q: string,
    recentSearches: string[]
  ): Promise<AutocompleteResult> {
    const res = await this.db.query(
      `SELECT p.id, p.name, p.slug, p.price, p.images[1] as thumbnail, c.name as category
       FROM public.products p
       JOIN public.categories c ON p.category_id = c.id
       WHERE p.status = 'active' AND p.name ILIKE $1
       LIMIT 5`,
      [`%${q}%`]
    );

    return {
      recentSearches,
      suggestions: res.rows.map((r: any) => r.name),
      products: res.rows,
    };
  }
}
