import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { OwnerApplicationSchema, ReviewApplicationSchema } from '@shop-sell/shared';

describe('Phase 2: Seller Application & Approval Logic', () => {
  it('should validate seller application payload with complete payout details', () => {
    const validApp = {
      business_name: 'Artisan Woodworks India',
      business_type: 'sole_proprietorship',
      tax_id: '29ABCDE1234F1Z5',
      payout_details: {
        account_holder_name: 'Suresh Kumar',
        account_number: '123456789012',
        ifsc_code: 'SBIN0001234',
        bank_name: 'State Bank of India',
      },
    };

    const parsed = OwnerApplicationSchema.safeParse(validApp);
    assert.strictEqual(parsed.success, true);
  });

  it('should reject invalid IFSC code during seller application', () => {
    const invalidApp = {
      business_name: 'Artisan Woodworks India',
      business_type: 'sole_proprietorship',
      payout_details: {
        account_holder_name: 'Suresh Kumar',
        account_number: '123456789012',
        ifsc_code: 'INVALID_IFSC_123', // Doesn't match 4 letters + 0 + 6 alphanumeric
        bank_name: 'SBI',
      },
    };

    const parsed = OwnerApplicationSchema.safeParse(invalidApp);
    assert.strictEqual(parsed.success, false);
  });

  it('should validate admin approval or rejection payload', () => {
    const approval = {
      status: 'approved',
    };
    assert.strictEqual(ReviewApplicationSchema.safeParse(approval).success, true);

    const rejection = {
      status: 'rejected',
      rejection_reason: 'Incomplete bank verification documents provided',
    };
    assert.strictEqual(ReviewApplicationSchema.safeParse(rejection).success, true);

    const invalidStatus = {
      status: 'cancelled',
    };
    assert.strictEqual(ReviewApplicationSchema.safeParse(invalidStatus).success, false);
  });

  it('should simulate dual-role transition upon approval', () => {
    const currentRoles = ['customer'];

    // Simulation of approval update: roles = array_append(roles, 'owner')
    const updatedRoles = currentRoles.includes('owner')
      ? currentRoles
      : [...currentRoles, 'owner'];

    assert.deepStrictEqual(updatedRoles, ['customer', 'owner']);
    assert.strictEqual(updatedRoles.includes('customer'), true, 'User must remain customer');
    assert.strictEqual(updatedRoles.includes('owner'), true, 'User must gain owner role');
  });
});
