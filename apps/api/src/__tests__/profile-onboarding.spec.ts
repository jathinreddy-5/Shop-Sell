import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import {
  Step1OnboardingSchema,
  Step2OnboardingSchema,
  AddressInputSchema,
  PincodeWaitlistSchema,
} from '@shop-sell/shared';
import { ProfileService } from '../modules/profile/profile.service';
import { MockSmsProvider } from '../modules/profile/sms-provider.interface';

describe('Post-Login Progressive Profiling Specification Tests', () => {
  // 1. Step 1 Validation Rules
  describe('Step 1: Identity & Preferences Validation', () => {
    it('should accept valid full name and 6-digit Indian pincode', () => {
      const valid = {
        full_name: 'Jathin Reddy',
        pincode: '560034',
        interest_ids: ['a0000000-0000-0000-0000-000000000001'],
        size_profile: { top: 'L', footwear: 'UK 10' },
      };
      const res = Step1OnboardingSchema.safeParse(valid);
      assert.strictEqual(res.success, true);
    });

    it('should reject full name shorter than 2 characters or longer than 80', () => {
      const short = { full_name: 'J' };
      assert.strictEqual(Step1OnboardingSchema.safeParse(short).success, false);

      const long = { full_name: 'A'.repeat(81) };
      assert.strictEqual(Step1OnboardingSchema.safeParse(long).success, false);
    });

    it('should reject invalid Indian pincode formats (starting with 0, non-digits, wrong length)', () => {
      assert.strictEqual(Step1OnboardingSchema.safeParse({ full_name: 'Valid Name', pincode: '012345' }).success, false);
      assert.strictEqual(Step1OnboardingSchema.safeParse({ full_name: 'Valid Name', pincode: '56003' }).success, false);
      assert.strictEqual(Step1OnboardingSchema.safeParse({ full_name: 'Valid Name', pincode: '5600345' }).success, false);
      assert.strictEqual(Step1OnboardingSchema.safeParse({ full_name: 'Valid Name', pincode: '56003A' }).success, false);
    });

    it('should allow skipping pincode, interests, and size profile on step 1', () => {
      const minimal = { full_name: 'Minimal User' };
      const res = Step1OnboardingSchema.safeParse(minimal);
      assert.strictEqual(res.success, true);
    });
  });

  // 2. Step 2 Validation Rules
  describe('Step 2: Personalization & Consent Validation', () => {
    it('should accept valid shopping_for and gender selections including prefer_not_to_say', () => {
      const valid = {
        shopping_for: 'mens',
        gender: 'male',
        marketing_consent: false, // Must be un-ticked by default
        marketing_consent_text_version: 'v1.0.0-2026',
      };
      const res = Step2OnboardingSchema.safeParse(valid);
      assert.strictEqual(res.success, true);
    });

    it('should reject unknown gender or shopping_for enum values', () => {
      assert.strictEqual(
        Step2OnboardingSchema.safeParse({ gender: 'alien' }).success,
        false
      );
      assert.strictEqual(
        Step2OnboardingSchema.safeParse({ shopping_for: 'pets' }).success,
        false
      );
    });

    it('should accept non_binary and prefer_not_to_say options without discrimination', () => {
      const nonBinary = { gender: 'non_binary', shopping_for: 'unisex' };
      assert.strictEqual(Step2OnboardingSchema.safeParse(nonBinary).success, true);

      const preferNot = { gender: 'prefer_not_to_say', shopping_for: 'prefer_not_to_say' };
      assert.strictEqual(Step2OnboardingSchema.safeParse(preferNot).success, true);
    });
  });

  // 3. Multi-Address & GSTIN Validation Rules
  describe('Multi-Address Schema & Constraints', () => {
    it('should validate full address with E.164 phone and Indian pincode', () => {
      const addr = {
        label: 'Home',
        type: 'shipping',
        recipient_name: 'Jathin Reddy',
        phone_e164: '+919876543210',
        line1: 'Flat 402, Skyline Residency, 12th Main',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560034',
        country_code: 'IN',
        is_default: true,
      };
      const res = AddressInputSchema.safeParse(addr);
      assert.strictEqual(res.success, true);
    });

    it('should validate legal Indian GSTIN format if provided', () => {
      const validGstin = {
        label: 'Office',
        type: 'billing',
        recipient_name: 'Enterprise Pvt Ltd',
        phone_e164: '+919876543210',
        line1: 'Tech Park, Whitefield',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560066',
        gstin: '29ABCDE1234F1Z5', // 2 digits state + 10 PAN + 1 entity + Z + 1 check
        is_default: false,
      };
      assert.strictEqual(AddressInputSchema.safeParse(validGstin).success, true);

      const invalidGstin = {
        ...validGstin,
        gstin: 'INVALID_GSTIN_123',
      };
      assert.strictEqual(AddressInputSchema.safeParse(invalidGstin).success, false);
    });

    it('should reject invalid phone numbers not in E.164 format', () => {
      const badPhone = {
        label: 'Home',
        type: 'shipping',
        recipient_name: 'Jathin Reddy',
        phone_e164: '9876543210', // Missing + country code
        line1: '12th Main Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560034',
      };
      assert.strictEqual(AddressInputSchema.safeParse(badPhone).success, false);
    });
  });

  // 4. Serviceability and Pincode Waitlist
  describe('Pincode Serviceability & Waitlist', () => {
    it('should accept valid 6-digit pincode and optional email for waitlist', () => {
      const res = PincodeWaitlistSchema.safeParse({
        pincode: '560099',
        email: 'notify@example.com',
      });
      assert.strictEqual(res.success, true);
    });

    it('should reject invalid email in waitlist', () => {
      const res = PincodeWaitlistSchema.safeParse({
        pincode: '560099',
        email: 'not-an-email',
      });
      assert.strictEqual(res.success, false);
    });
  });

  // 5. Security & Authorization Enforcement (JWT sub derivation)
  describe('Security & Authorization Boundary', () => {
    it('should demonstrate mock DB isolation: User A cannot read or delete User B addresses', async () => {
      const mockRows: any[] = [
        { id: 'addr-1', user_id: 'user-a-uuid', line1: 'Street A' },
        { id: 'addr-2', user_id: 'user-b-uuid', line1: 'Street B' },
      ];

      const mockDb: any = {
        query: async (text: string, params: any[]) => {
          if (text.includes('DELETE FROM public.addresses')) {
            const [addressId, userId] = params;
            const idx = mockRows.findIndex(
              (r) => r.id === addressId && r.user_id === userId
            );
            if (idx === -1) return { rows: [] };
            const deleted = mockRows.splice(idx, 1);
            return { rows: deleted };
          }
          if (text.includes('public.addresses') && text.includes('user_id = $1')) {
            const [userId] = params;
            return { rows: mockRows.filter((r) => r.user_id === userId) };
          }
          return { rows: [] };
        },
      };

      const profileService = new ProfileService(mockDb, new MockSmsProvider());

      // User A lists addresses: only sees addr-1
      const userAAddresses = await profileService.listAddresses('user-a-uuid');
      assert.strictEqual(userAAddresses.length, 1);
      assert.strictEqual(userAAddresses[0].id, 'addr-1');

      // User A attempts to delete User B's address addr-2: Must fail with NotFoundException
      await assert.rejects(
        async () => {
          await profileService.deleteAddress('user-a-uuid', 'addr-2');
        },
        (err: any) => err.message === 'Address not found'
      );

      // Verify User B's address is still intact
      const userBAddresses = await profileService.listAddresses('user-b-uuid');
      assert.strictEqual(userBAddresses.length, 1);
      assert.strictEqual(userBAddresses[0].id, 'addr-2');
    });
  });
});
