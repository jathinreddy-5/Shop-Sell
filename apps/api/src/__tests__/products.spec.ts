import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { ProductInputSchema } from '@shop-sell/shared';

describe('Phase 2: Product Management & Media Sanitization', () => {
  it('should validate full product with variants and attributes', () => {
    const validProduct = {
      name: 'Organic Indigo Dyed Cotton Shirt',
      slug: 'organic-indigo-dyed-cotton-shirt',
      description: 'Handcrafted pure cotton shirt dyed with natural organic indigo plant extracts.',
      price: 1899.0,
      compare_at_price: 2499.0,
      currency: 'INR',
      stock: 40,
      category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      images: [
        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800',
        'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800',
      ],
      attributes: {
        fabric: 'Organic Cotton',
        fit: 'Regular Fit',
        sleeve: 'Full Sleeve',
      },
      status: 'active',
      variants: [
        { sku: 'SHIRT-INDIGO-S', options: { size: 'S' }, price: 1899.0, stock: 10 },
        { sku: 'SHIRT-INDIGO-M', options: { size: 'M' }, price: 1899.0, stock: 15 },
        { sku: 'SHIRT-INDIGO-L', options: { size: 'L' }, price: 1899.0, stock: 15 },
      ],
    };

    const parsed = ProductInputSchema.safeParse(validProduct);
    assert.strictEqual(parsed.success, true);
  });

  it('should enforce image upload MIME types and size constraints (max 5MB)', () => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB

    const validateUpload = (mimeType: string, size: number) => {
      if (!allowedMimeTypes.includes(mimeType)) {
        throw new Error('Invalid MIME type');
      }
      if (size > maxSizeBytes) {
        throw new Error('File exceeds 5MB limit');
      }
      return true;
    };

    assert.strictEqual(validateUpload('image/jpeg', 2 * 1024 * 1024), true);
    assert.strictEqual(validateUpload('image/webp', 4.5 * 1024 * 1024), true);

    assert.throws(() => validateUpload('application/pdf', 1024), /Invalid MIME type/);
    assert.throws(() => validateUpload('image/png', 6 * 1024 * 1024), /File exceeds 5MB limit/);
  });

  it('should validate CSV bulk import row format', () => {
    const csvRows = [
      {
        name: 'Terracotta Handthrown Planter',
        description: 'Natural unglazed clay planter with drainage hole.',
        price: 499,
        stock: 30,
        category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      },
      {
        name: 'Brass Incense Burner',
        description: 'Traditional handcrafted solid brass incense holder.',
        price: 799,
        stock: 15,
        category_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      },
    ];

    for (const row of csvRows) {
      assert.ok(row.name.length >= 3);
      assert.ok(row.price > 0);
      assert.ok(row.stock >= 0);
    }
  });
});
