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

export type GenderType = 'female' | 'male' | 'non_binary' | 'prefer_not_to_say';
export type ShoppingForType = 'womens' | 'mens' | 'unisex' | 'kids' | 'prefer_not_to_say';
export type OnboardingStatus = 'not_started' | 'step1_done' | 'completed' | 'skipped';

export interface Profile {
  id: string; // references auth.users.id
  full_name: string | null;
  display_name?: string | null;
  phone: string | null;
  phone_e164?: string | null;
  phone_verified?: boolean;
  email_verified?: boolean;
  avatar_url: string | null;
  roles: UserRole[];
  gender?: GenderType | null;
  shopping_for?: ShoppingForType | null;
  default_pincode?: string | null;
  is_18_plus?: boolean | null;
  age_range?: string | null;
  locale?: string;
  currency?: string;
  size_profile?: Record<string, string>;
  notification_preferences?: {
    transactional: boolean;
    marketing: boolean;
    [key: string]: boolean;
  };
  marketing_consent?: boolean;
  marketing_consent_at?: string | null;
  marketing_consent_text_version?: string | null;
  onboarding_status?: OnboardingStatus;
  onboarding_skipped_count?: number;
  onboarding_last_prompted_at?: string | null;
  profile_completeness?: number;
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
  phone?: string;
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

export interface InterestCategory {
  id: string;
  slug: string;
  label: string;
  parent_id?: string | null;
  is_apparel: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ProfileInterest {
  profile_id: string;
  interest_id: string;
  created_at: string;
}

export interface ServiceablePincode {
  pincode: string;
  city: string;
  state: string;
  estimated_days: number;
  is_active: boolean;
  created_at: string;
}

export interface PincodeWaitlistEntry {
  id: string;
  pincode: string;
  user_id?: string | null;
  email?: string | null;
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  type: 'shipping' | 'billing';
  recipient_name: string;
  phone_e164: string;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  country_code: string;
  gstin?: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConsentLog {
  id: string;
  user_id: string;
  consent_type: string;
  granted: boolean;
  text_version: string;
  ip_hash?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export interface Step1OnboardingInput {
  full_name: string;
  pincode?: string;
  interest_ids?: string[];
  size_profile?: Record<string, string>;
}

export interface Step2OnboardingInput {
  shopping_for?: ShoppingForType;
  gender?: GenderType;
  marketing_consent?: boolean;
  marketing_consent_text_version?: string;
}

export interface ServiceabilityResult {
  pincode: string;
  isServiceable: boolean;
  city?: string;
  state?: string;
  estimatedDays?: number;
  message: string;
}

// ==============================================================================
// ADMIN OPERATIONS & GOVERNANCE TYPES (PHASE 1)
// ==============================================================================

export type AdminStatus = 'active' | 'suspended' | 'offboarded';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  status: AdminStatus;
  mfa_enrolled: boolean;
  requires_passkey: boolean;
  sso_subject?: string | null;
  created_by?: string | null;
  last_review_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type AdminRoleSlug =
  | 'super_admin'
  | 'finance_controller'
  | 'trust_safety'
  | 'customer_support'
  | 'seller_ops'
  | 'catalog_manager'
  | 'merchandiser'
  | 'auditor'
  | 'support_engineer';

export interface AdminRole {
  id: string;
  name: string;
  slug: AdminRoleSlug | string;
  description?: string | null;
  is_system: boolean;
  max_session_duration_minutes: number;
  requires_passkey: boolean;
  created_at: string;
  permissions?: string[]; // array of "resource:action" strings
}

export interface AdminPermission {
  id: string;
  resource: string;
  action: string;
  description?: string | null;
  risk_level: 'low' | 'standard' | 'high' | 'critical';
  created_at: string;
}

export interface AdminRoleAssignment {
  id: string;
  admin_id: string;
  role_id: string;
  role?: AdminRole;
  scope_type?: string | null;
  scope_value?: string | null;
  granted_by?: string | null;
  expires_at?: string | null;
  created_at: string;
}

export interface ElevatedAccessGrant {
  id: string;
  admin_id: string;
  role_id?: string | null;
  permission_id?: string | null;
  reason: string;
  ticket_ref: string;
  approved_by?: string | null;
  starts_at: string;
  expires_at: string;
  is_revoked: boolean;
  revoked_at?: string | null;
  is_break_glass: boolean;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  created_at: string;
  actor_admin_id?: string | null;
  actor_role_at_time: string;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  outcome: 'success' | 'denied' | 'error';
  reason?: string | null;
  ticket_ref?: string | null;
  before_state?: any;
  after_state?: any;
  approver_ids?: string[];
  request_id?: string | null;
  session_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  prev_hash?: string | null;
  row_hash: string;
}

export interface ApprovalPolicy {
  id: string;
  action_key: string;
  threshold_params: Record<string, any>;
  required_approvals: number;
  required_permission: string;
  expiry_hours: number;
  allow_emergency_single: boolean;
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  action_key: string;
  payload: any;
  payload_hash: string;
  requester_id: string;
  requester?: Partial<AdminUser>;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'executed' | 'cancelled';
  expires_at: string;
  executed_at?: string | null;
  created_at: string;
  decisions?: ApprovalDecision[];
}

export interface ApprovalDecision {
  id: string;
  request_id: string;
  approver_id: string;
  approver?: Partial<AdminUser>;
  decision: 'approved' | 'rejected';
  step_up_proof?: any;
  reason?: string | null;
  decided_at: string;
}

export interface AdminKillSwitch {
  key: string;
  enabled: boolean;
  reason?: string | null;
  updated_by?: string | null;
  updated_at: string;
}

export interface AdminSession {
  admin_id: string;
  email: string;
  session_id: string;
  roles: string[];
  permissions: string[];
  ip_address?: string;
  user_agent?: string;
  mfa_verified: boolean;
  last_active_at: number;
  expires_at: number;
  step_up_at?: number;
}

