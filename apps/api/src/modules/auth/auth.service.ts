import { Injectable, NotFoundException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { AuthUserPayload, Profile, UserRole } from '@shop-sell/shared';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;

  constructor(private readonly db: DatabaseService) {
    this.jwtSecret =
      process.env.SUPABASE_JWT_SECRET ||
      'super-secret-jwt-token-with-minimum-32-characters-long';
  }

  async getProfile(userId: string): Promise<Profile> {
    const res = await this.db.query<Profile>(
      `SELECT id, full_name, phone, avatar_url, roles, created_at, updated_at
       FROM public.profiles
       WHERE id = $1`,
      [userId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }

    return res.rows[0];
  }

  async syncProfile(
    userId: string,
    data: { fullName?: string; phone?: string; avatarUrl?: string }
  ): Promise<Profile> {
    const res = await this.db.query<Profile>(
      `INSERT INTO public.profiles (id, full_name, phone, avatar_url, roles)
       VALUES ($1, $2, $3, $4, ARRAY['customer']::text[])
       ON CONFLICT (id) DO UPDATE SET
         full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
         phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
         avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
         updated_at = NOW()
       RETURNING id, full_name, phone, avatar_url, roles, created_at, updated_at`,
      [userId, data.fullName || null, data.phone || null, data.avatarUrl || null]
    );

    return res.rows[0];
  }

  generateDevToken(userId: string, email: string, roles: UserRole[] = ['customer']): string {
    const payload = {
      sub: userId,
      email,
      role: 'authenticated',
      app_metadata: {
        provider: 'email',
        roles,
      },
      user_metadata: {
        roles,
      },
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: '7d' });
  }
}
