import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateDecayedWeight,
  EVENT_WEIGHTS,
  DEFAULT_REC_LAMBDA,
  OwnerApplicationSchema,
  ProductInputSchema,
  CheckoutInputSchema,
  USER_ROLES,
} from '../index';

describe('Shared Package Unit Tests', () => {
  it('should correctly calculate event decay over time', () => {
    // At t=0, decayed weight equals base weight
    const searchWeightAtZero = calculateDecayedWeight('search', 0);
    assert.strictEqual(searchWeightAtZero, EVENT_WEIGHTS.search);

    // At t=7 days (half-life), weight should be approx 50%
    const searchWeightAtHalfLife = calculateDecayedWeight('search', 7);
    assert.ok(Math.abs(searchWeightAtHalfLife - EVENT_WEIGHTS.search * 0.5) < 0.01);

    // Purchase weight decays slower/faster according to lambda
    const purchaseWeightAtZero = calculateDecayedWeight('purchase', 0);
    assert.strictEqual(purchaseWeightAtZero, 4.0);

    const purchaseAt14Days = calculateDecayedWeight('purchase', 14);
    assert.ok(Math.abs(purchaseAt14Days - 4.0 * 0.25) < 0.01);
  });

  it('should validate owner onboarding application schema correctly', () => {
    const validApplication = {
      business_name: 'Artisan Potteries',
      business_type: 'sole_proprietorship',
      tax_id: '27AAAAA0000A1Z5',
      payout_details: {
        account_holder_name: 'Rahul Sharma',
        account_number: '123456789012',
        ifsc_code: 'HDFC0001234',
        bank_name: 'HDFC Bank',
      },
    };

    const parsed = OwnerApplicationSchema.safeParse(validApplication);
    assert.strictEqual(parsed.success, true);

    const invalidApplication = {
      business_name: 'A', // too short
      business_type: 'unknown_type',
      payout_details: {
        account_holder_name: '',
        account_number: '12',
        ifsc_code: 'invalid-ifsc',
        bank_name: '',
      },
    };

    const invalidParsed = OwnerApplicationSchema.safeParse(invalidApplication);
    assert.strictEqual(invalidParsed.success, false);
  });

  it('should validate product schema and reject negative stock or empty images', () => {
    const validProduct = {
      name: 'Handcrafted Ceramic Mug',
      slug: 'handcrafted-ceramic-mug',
      description: 'A beautiful stoneware ceramic mug made with organic clay.',
      price: 499.0,
      currency: 'INR',
      stock: 25,
      category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      images: ['https://media.shopsell.example.com/mug-1.jpg'],
      attributes: { material: 'Ceramic', volume_ml: 350 },
      status: 'active',
    };

    const parsed = ProductInputSchema.safeParse(validProduct);
    assert.strictEqual(parsed.success, true);

    const negativeStockProduct = {
      ...validProduct,
      stock: -5,
    };
    const invalidParsed = ProductInputSchema.safeParse(negativeStockProduct);
    assert.strictEqual(invalidParsed.success, false);
  });

  it('should validate checkout schema and require valid shipping address', () => {
    const checkout = {
      shipping_address: {
        full_name: 'Priya Patel',
        phone: '9876543210',
        street: '42 MG Road, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        postal_code: '560038',
        country: 'India',
      },
      idempotency_key: 'idemp_order_abc12345',
    };

    const parsed = CheckoutInputSchema.safeParse(checkout);
    assert.strictEqual(parsed.success, true);
  });

  it('should have correct user role constants', () => {
    assert.strictEqual(USER_ROLES.CUSTOMER, 'customer');
    assert.strictEqual(USER_ROLES.OWNER, 'owner');
    assert.strictEqual(USER_ROLES.ADMIN, 'admin');
  });
});
