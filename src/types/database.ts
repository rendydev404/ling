export type UserRole = "admin" | "buyer" | "affiliate";

export type ProductType =
  | "digital"
  | "course"
  | "appointment"
  | "event"
  | "physical"
  | "donation"
  | "membership";

export type ProductStatus = "draft" | "published" | "archived";

export type BioBlockType =
  | "link"
  | "product"
  | "heading"
  | "text"
  | "image"
  | "video"
  | "divider";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "expired"
  | "cancelled"
  | "refunded";

export type ShippingStatus =
  | "not_applicable"
  | "processing"
  | "shipped"
  | "delivered";

export type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "completed"
  | "rescheduled"
  | "cancelled";

export interface ThemeConfig {
  preset: "clean-light" | "warm-paper" | "slate-dark" | "forest-crisp" | "midnight-ink";
  backgroundColor: string;
  surfaceColor: string;
  borderColor: string;
  textColor: string;
  mutedTextColor: string;
  accentColor: string;
  accentTextColor: string;
  buttonRadius: "md" | "xl" | "full" | "none";
}

export interface SocialLinkItem {
  platform:
    | "instagram"
    | "tiktok"
    | "youtube"
    | "twitter"
    | "linkedin"
    | "whatsapp"
    | "email"
    | "website";
  url: string;
  label?: string;
}

export interface SeoConfig {
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string;
}

export interface PixelsConfig {
  metaPixelId: string;
  tiktokPixelId: string;
  ga4MeasurementId: string;
}

export interface ShippingOption {
  code: string;
  name: string;
  estimatedDays: string;
  cost: number;
}

export interface StoreSettings {
  id: string;
  brand_name: string;
  handle: string;
  tagline: string;
  bio: string;
  avatar_url: string | null;
  verified_badge: boolean;
  theme_config: ThemeConfig;
  social_links: SocialLinkItem[];
  seo_config: SeoConfig;
  pixels_config: PixelsConfig;
  shipping_options: ShippingOption[];
  default_affiliate_commission_pct: number;
  affiliate_auto_approve: boolean;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  created_at: string;
}

export interface BioBlock {
  id: string;
  type: BioBlockType;
  title: string | null;
  subtitle: string | null;
  url: string | null;
  image_url: string | null;
  product_id: string | null;
  badge_text: string | null;
  layout_style: "compact" | "featured";
  is_active: boolean;
  sort_order: number;
  click_count: number;
  metadata: Record<string, unknown>;
}

export interface ProductMetadata {
  // Digital
  delivery_note?: string;
  // Appointment
  duration_minutes?: number;
  buffer_minutes?: number;
  meeting_link?: string;
  meeting_platform?: string;
  timezone?: string;
  // Event
  event_date?: string;
  event_end_date?: string;
  event_mode?: "online" | "offline";
  event_location?: string;
  event_meeting_url?: string;
  max_capacity?: number;
  // Physical
  weight_grams?: number;
  requires_shipping?: boolean;
  // Donation
  preset_amounts?: number[];
  allow_anonymous?: boolean;
  // Membership
  billing_cycle?: "monthly" | "quarterly" | "yearly";
  duration_days?: number;
  benefits?: string[];
  community_link?: string;
  member_welcome_note?: string;
  // Course
  course_level?: "beginner" | "intermediate" | "advanced";
  certificate_enabled?: boolean;
}

export interface Product {
  id: string;
  slug: string;
  type: ProductType;
  title: string;
  short_description: string | null;
  description: string | null;
  thumbnail_url: string | null;
  gallery_urls: string[];
  price: number;
  compare_at_price: number | null;
  is_pay_what_you_want: boolean;
  min_price: number;
  status: ProductStatus;
  is_featured: boolean;
  stock_quantity: number | null;
  order_bump_product_id: string | null;
  order_bump_price: number | null;
  order_bump_headline: string | null;
  affiliate_enabled: boolean;
  affiliate_commission_pct: number;
  metadata: ProductMetadata;
  created_at: string;
  updated_at: string;
}

export interface ProductDigitalAsset {
  id: string;
  product_id: string;
  asset_type: "file" | "external_url" | "license_key";
  title: string;
  storage_path: string | null;
  external_url: string | null;
  license_key_value: string | null;
  file_size_bytes: number | null;
  download_limit: number | null;
  sort_order: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price_override: number | null;
  stock_quantity: number;
  weight_grams: number;
  is_active: boolean;
}

export interface CourseSection {
  id: string;
  product_id: string;
  title: string;
  sort_order: number;
  lessons?: CourseLesson[];
}

export interface CourseLesson {
  id: string;
  section_id: string;
  product_id: string;
  title: string;
  content_type: "video" | "article" | "file";
  video_url: string | null;
  body_markdown: string | null;
  attachment_path: string | null;
  duration_minutes: number;
  is_free_preview: boolean;
  sort_order: number;
}

export interface AppointmentAvailability {
  id: string;
  product_id: string;
  day_of_week: number; // 0 = Sunday .. 6 = Saturday
  start_time: string; // "09:00"
  end_time: string; // "17:00"
  is_active: boolean;
}

export interface AppointmentBooking {
  id: string;
  order_id: string | null;
  product_id: string;
  buyer_user_id: string | null;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  booking_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  meeting_link: string | null;
  notes: string | null;
  status: BookingStatus;
  created_at: string;
}

export interface Voucher {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  max_discount_amount: number | null;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  applicable_product_id: string | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  midtrans_order_id: string;
  buyer_user_id: string | null;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  voucher_id: string | null;
  voucher_code: string | null;
  affiliate_id: string | null;
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  total_amount: number;
  payment_status: PaymentStatus;
  payment_method: string | null;
  midtrans_snap_token: string | null;
  midtrans_redirect_url: string | null;
  shipping_address: Record<string, string> | null;
  shipping_courier: string | null;
  shipping_tracking_number: string | null;
  shipping_status: ShippingStatus;
  buyer_note: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  product_title: string;
  product_type: ProductType;
  is_order_bump: boolean;
  unit_price: number;
  quantity: number;
  total_price: number;
  metadata: Record<string, unknown>;
}

export interface Affiliate {
  id: string;
  user_id: string;
  referral_code: string;
  status: "pending" | "active" | "suspended";
  commission_rate_override: number | null;
  total_clicks: number;
  total_conversions: number;
  total_earned: number;
  total_paid_out: number;
  created_at: string;
}

export interface OutboundWebhook {
  id: string;
  name: string;
  target_url: string;
  secret_key: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}
