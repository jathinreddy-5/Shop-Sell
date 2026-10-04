import { SetMetadata } from '@nestjs/common';

export const ADMIN_PERMISSION_KEY = 'admin_permission';
export const IS_PUBLIC_ADMIN_KEY = 'is_public_admin';
export const SKIP_AUDIT_KEY = 'skip_audit';

/**
 * Enforces that an admin user must possess the specified granular permission string.
 * Example: @RequirePermission('payout:approve')
 */
export const RequirePermission = (permission: string) =>
  SetMetadata(ADMIN_PERMISSION_KEY, permission);

/**
 * Marks an admin route as unauthenticated (e.g. login, passkey challenges).
 */
export const PublicAdmin = () => SetMetadata(IS_PUBLIC_ADMIN_KEY, true);

/**
 * Skips automatic audit logging for high-frequency or read-only metrics polls.
 */
export const SkipAudit = () => SetMetadata(SKIP_AUDIT_KEY, true);
