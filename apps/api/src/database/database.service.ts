import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool, PoolClient, QueryResult } from 'pg';

const DEFAULT_PROD_DB =
  'postgresql://postgres.vlvkmednwsjpcdarnabo:ShopSell1012@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  constructor() {
    const raw = process.env.DATABASE_URL?.trim();
    const isProd = process.env.NODE_ENV === 'production';
    const connectionString =
      raw && (!isProd || (!raw.includes('localhost') && !raw.includes('127.0.0.1')))
        ? raw
        : isProd
          ? DEFAULT_PROD_DB
          : 'postgresql://postgres:postgres@localhost:54322/postgres';

    const isRemote =
      connectionString.includes('supabase.com') ||
      connectionString.includes('pooler') ||
      connectionString.includes('aws-');

    this.pool = new Pool({
      connectionString,
      ssl: isRemote ? { rejectUnauthorized: false } : undefined,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    this.pool.on('error', (err) => {
      console.warn('PostgreSQL Pool unexpected error on idle client:', err.message);
    });
  }

  async onModuleInit() {
    try {
      const client = await this.pool.connect();
      client.release();
    } catch (err: any) {
      console.warn(
        `[DatabaseService] PostgreSQL not immediately reachable at startup (${err.message}). API will retry on incoming queries.`
      );
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async withTransaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
