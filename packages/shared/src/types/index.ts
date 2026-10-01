export type UserRole = 'customer' | 'owner' | 'admin';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export type StoreStatus = 'pending' | 'active' | 'suspended';

export type ProductStatus = 'draft' | 'active' | 'archived';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'failed'
  | 'refunded';

export type FulfilmentStatus =
  | 'unfulfilled'
  | 'processing'
  | 'fulfilled'
  | 'cancelled';

export type UserEventType =
  | 'search'
  | 'view'
  | 'add_to_cart'
  | 'wishlist'
  | 'purchase'
  | 'click'
  | 'impression';

export interface PayoutDetails {
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
  upi_id?: string;
}

export interface Profile {
  id: string; // references auth.users.id
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  roles: UserRole[];
  created_at: string;
  updated_at: string;
}

export interface OwnerApplication {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  tax_id: string | null;
  payout_details: PayoutDetails;
  status: ApplicationStatus;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
}

export interface Store {
  id: string;
  owner_id: string;
  store_name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  payout_details: PayoutDetails | null;
  status: StoreStatus;
  rating_avg: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  attribute_schema: Record<string, any>;
  created_at: string;
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  currency: string;
  stock: number;
  category_id: string;
  images: string[];
  attributes: Record<string, any>;
  embedding?: number[];
  rating_avg: number;
  rating_count: number;
  sales_count: number;
  view_count: number;
  status: ProductStatus;
  store_name?: string;
  category_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  options: Record<string, string>;
  price: number;
  stock: number;
  created_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  variant_id: string | null;
  qty: number;
  created_at: string;
  product?: Product;
  variant?: ProductVariant | null;
}

export interface Cart {
  id: string;
  user_id: string | null;
  session_id: string | null;
  created_at: string;
  updated_at: string;
  items?: CartItem[];
}

export interface ShippingAddress {
  full_name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  total: number;
  payment_status: PaymentStatus;
  razorpay_order_id: string | null;
  shipping_address: ShippingAddress;
  idempotency_key?: string | null;
  created_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  store_id: string;
  qty: number;
  unit_price: number;
  fulfilment_status: FulfilmentStatus;
  product?: Product;
}

export interface Payout {
  id: string;
  store_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  period_start: string;
  period_end: string;
  created_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  body: string;
  created_at: string;
  user_name?: string;
}

export interface Refund {
  id: string;
  order_id: string;
  order_item_id: string | null;
  amount: number;
  reason: string;
  status: 'pending' | 'processing' | 'processed' | 'failed';
  created_by: string | null;
  razorpay_refund_id: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, any>;
  created_at: string;
}

export interface UserEvent {
  id: string;
  user_id: string | null;
  anonymous_id: string | null;
  event_type: UserEventType;
  query: string | null;
  product_id: string | null;
  category_id: string | null;
  created_at: string;
}

export interface AuthUserPayload {
  sub: string; // user id
  email?: string;
  roles: UserRole[];
  app_metadata?: {
    roles?: UserRole[];
    [key: string]: any;
  };
  user_metadata?: Record<string, any>;
}

export interface RecommendationRail {
  title: string;
  reason: string;
  products: Product[];
}

export interface HomeRecommendationsResponse {
  recentSearches: string[];
  rails: RecommendationRail[];
  recommended: Product[];
  trending: Product[];
}
