import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationStatus,
  OwnerApplication,
  Store,
  UserRole,
} from '@shop-sell/shared';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class SellersService {
  constructor(private readonly db: DatabaseService) {}

  async submitApplication(
    userId: string,
    data: {
      business_name: string;
      business_type: string;
      tax_id?: string | null;
      payout_details: any;
    }
  ): Promise<OwnerApplication> {
    // 1. Check if user already has an active store or pending application
    const existingApp = await this.db.query(
      `SELECT id, status FROM public.owner_applications WHERE user_id = $1 AND status = 'pending'`,
      [userId]
    );

    if (existingApp.rows.length > 0) {
      throw new BadRequestException('You already have a pending seller application under review.');
    }

    const existingStore = await this.db.query(
      `SELECT id FROM public.stores WHERE owner_id = $1 AND status = 'active'`,
      [userId]
    );

    if (existingStore.rows.length > 0) {
      throw new BadRequestException('You already have an active store registered.');
    }

    // 2. Insert application
    const res = await this.db.query<OwnerApplication>(
      `INSERT INTO public.owner_applications (
        user_id, business_name, business_type, tax_id, payout_details, status
      ) VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *`,
      [
        userId,
        data.business_name,
        data.business_type,
        data.tax_id || null,
        JSON.stringify(data.payout_details),
      ]
    );

    return res.rows[0];
  }

  async getMyApplication(userId: string): Promise<OwnerApplication | null> {
    const res = await this.db.query<OwnerApplication>(
      `SELECT * FROM public.owner_applications WHERE user_id = $1 ORDER BY submitted_at DESC LIMIT 1`,
      [userId]
    );
    return res.rows[0] || null;
  }

  async getStoreByOwner(userId: string): Promise<Store | null> {
    const res = await this.db.query<Store>(
      `SELECT * FROM public.stores WHERE owner_id = $1 LIMIT 1`,
      [userId]
    );
    return res.rows[0] || null;
  }

  async listPendingApplications(): Promise<OwnerApplication[]> {
    const res = await this.db.query<OwnerApplication>(
      `SELECT oa.*, p.full_name as applicant_name
       FROM public.owner_applications oa
       LEFT JOIN public.profiles p ON oa.user_id = p.id
       ORDER BY oa.submitted_at ASC`
    );
    return res.rows;
  }

  async reviewApplication(
    applicationId: string,
    reviewerId: string,
    action: { status: 'approved' | 'rejected'; rejection_reason?: string }
  ): Promise<{ application: OwnerApplication; store?: Store }> {
    return this.db.withTransaction(async (client) => {
      // 1. Fetch application with row lock
      const appRes = await client.query<OwnerApplication>(
        `SELECT * FROM public.owner_applications WHERE id = $1 FOR UPDATE`,
        [applicationId]
      );

      if (appRes.rows.length === 0) {
        throw new NotFoundException(`Application ${applicationId} not found`);
      }

      const application = appRes.rows[0];

      if (application.status !== 'pending') {
        throw new BadRequestException(
          `Application is already in '${application.status}' state.`
        );
      }

      // 2. Update application status
      const updatedAppRes = await client.query<OwnerApplication>(
        `UPDATE public.owner_applications
         SET status = $1,
             rejection_reason = $2,
             reviewed_at = NOW(),
             reviewer_id = $3
         WHERE id = $4
         RETURNING *`,
        [
          action.status,
          action.rejection_reason || null,
          reviewerId,
          applicationId,
        ]
      );

      const updatedApplication = updatedAppRes.rows[0];

      // 3. If approved: add 'owner' role to profile and create store row
      if (action.status === 'approved') {
        // Add 'owner' role to profile if not present
        await client.query(
          `UPDATE public.profiles
           SET roles = CASE 
             WHEN 'owner' = ANY(roles) THEN roles
             ELSE array_append(roles, 'owner')
           END,
           updated_at = NOW()
           WHERE id = $1`,
          [application.user_id]
        );

        // Generate URL-friendly slug
        const rawSlug = application.business_name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        const slug = `${rawSlug}-${Math.random().toString(36).substring(2, 6)}`;

        // Create store row
        const storeRes = await client.query<Store>(
          `INSERT INTO public.stores (
            owner_id, store_name, slug, payout_details, status
          ) VALUES ($1, $2, $3, $4, 'active')
          RETURNING *`,
          [
            application.user_id,
            application.business_name,
            slug,
            JSON.stringify(application.payout_details),
          ]
        );

        // Write audit log entry
        try {
          await client.query(
            `INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
             VALUES ($1, $2, 'owner_application', $3, $4)`,
            [
              reviewerId,
              'seller_application_approved',
              applicationId,
              JSON.stringify({
                userId: application.user_id,
                businessName: application.business_name,
                storeId: storeRes.rows[0].id,
              }),
            ]
          );
        } catch {}

        return {
          application: updatedApplication,
          store: storeRes.rows[0],
        };
      }

      // Write audit log entry for rejection
      try {
        await client.query(
          `INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
           VALUES ($1, $2, 'owner_application', $3, $4)`,
          [
            reviewerId,
            'seller_application_rejected',
            applicationId,
            JSON.stringify({
              userId: application.user_id,
              businessName: application.business_name,
              reason: action.rejection_reason || null,
            }),
          ]
        );
      } catch {}

      return { application: updatedApplication };
    });
  }
}
