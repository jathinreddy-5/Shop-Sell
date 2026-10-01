import { z } from 'zod';

export const PayoutDetailsSchema = z.object({
  account_holder_name: z.string().min(2, 'Account holder name is required'),
  account_number: z.string().min(6, 'Valid account number required'),
  ifsc_code: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Valid Indian IFSC code required (e.g., HDFC0001234)'),
  bank_name: z.string().min(2, 'Bank name is required'),
  upi_id: z.string().optional(),
});

export const OwnerApplicationSchema = z.object({
  business_name: z.string().min(2, 'Business name must be at least 2 characters'),
  business_type: z.enum(['individual', 'sole_proprietorship', 'llp', 'pvt_ltd', 'partnership']),
  tax_id: z.string().optional().nullable(),
  payout_details: PayoutDetailsSchema,
});

export const ReviewApplicationSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejection_reason: z.string().optional().nullable(),
});

export const StoreUpdateSchema = z.object({
  store_name: z.string().min(2).optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
  logo_url: z.string().url().optional().nullable(),
  description: z.string().optional().nullable(),
  payout_details: PayoutDetailsSchema.optional(),
});

export const ProductVariantInputSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().min(1, 'SKU is required'),
  options: z.record(z.string()),
  price: z.number().positive('Price must be greater than zero'),
  stock: z.number().int().nonnegative('Stock cannot be negative'),
});

export const ProductInputSchema = z.object({
  name: z.string().min(3, 'Product name must be at least 3 characters'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().positive('Price must be positive'),
  compare_at_price: z.number().positive().optional().nullable(),
  currency: z.string().default('INR'),
  stock: z.number().int().nonnegative('Stock cannot be negative'),
  category_id: z.string().uuid('Category ID must be a valid UUID'),
  images: z.array(z.string().url()).min(1, 'At least one product image is required'),
  attributes: z.record(z.any()).default({}),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  variants: z.array(ProductVariantInputSchema).optional(),
});

export const CategoryInputSchema = z.object({
  parent_id: z.string().uuid().optional().nullable(),
  name: z.string().min(2, 'Category name is required'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  attribute_schema: z.record(z.any()).default({}),
});

export const ShippingAddressSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  phone: z.string().min(10, 'Valid 10-digit phone number is required'),
  street: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postal_code: z.string().min(6, 'Valid postal code is required'),
  country: z.string().default('India'),
});

export const AddToCartSchema = z.object({
  product_id: z.string().uuid('Product ID must be a valid UUID'),
  variant_id: z.string().uuid().optional().nullable(),
  qty: z.number().int().min(1, 'Quantity must be at least 1'),
  anonymous_id: z.string().optional().nullable(),
});

export const UpdateCartItemSchema = z.object({
  qty: z.number().int().min(0, 'Quantity must be 0 or positive (0 removes item)'),
});

export const CheckoutInputSchema = z.object({
  shipping_address: ShippingAddressSchema,
  idempotency_key: z.string().min(10, 'Idempotency key required'),
});

export const RazorpayVerifyPaymentSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  order_id: z.string().uuid(),
});

export const UserEventInputSchema = z.object({
  anonymous_id: z.string().optional().nullable(),
  event_type: z.enum(['search', 'view', 'add_to_cart', 'wishlist', 'purchase', 'click', 'impression']),
  query: z.string().optional().nullable(),
  product_id: z.string().uuid().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
});

export const ReviewInputSchema = z.object({
  product_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().min(5, 'Review must be at least 5 characters'),
});
