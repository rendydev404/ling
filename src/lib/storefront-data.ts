import {
  DEFAULT_STORE_SETTINGS,
  DEMO_BIO_BLOCKS,
  DEMO_COURSE_SECTIONS,
  DEMO_PRODUCTS,
  DEMO_VARIANTS,
} from "./demo-data";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "./supabase/server";
import type {
  AppointmentAvailability,
  BioBlock,
  CourseLesson,
  CourseSection,
  Product,
  ProductVariant,
  StoreSettings,
} from "@/types/database";

const PRODUCT_COLUMNS =
  "id, slug, type, title, short_description, description, thumbnail_url, gallery_urls, price, compare_at_price, is_pay_what_you_want, min_price, status, is_featured, stock_quantity, order_bump_product_id, order_bump_price, order_bump_headline, affiliate_enabled, affiliate_commission_pct, metadata, created_at, updated_at";

export async function getStorefrontBundle(): Promise<{
  settings: StoreSettings;
  blocks: BioBlock[];
  products: Product[];
  isDemoMode: boolean;
}> {
  if (!isSupabaseServerConfigured()) {
    return {
      settings: DEFAULT_STORE_SETTINGS,
      blocks: DEMO_BIO_BLOCKS,
      products: DEMO_PRODUCTS,
      isDemoMode: true,
    };
  }

  const supabase = await createServerSupabaseClient();

  const [settingsRes, blocksRes, productsRes] = await Promise.all([
    supabase
      .from("store_settings")
      .select(
        "id, brand_name, handle, tagline, bio, avatar_url, verified_badge, theme_config, social_links, seo_config, pixels_config, shipping_options, default_affiliate_commission_pct, affiliate_auto_approve, updated_at"
      )
      .eq("singleton_key", "primary")
      .single(),
    supabase
      .from("bio_blocks")
      .select(
        "id, type, title, subtitle, url, image_url, product_id, badge_text, layout_style, is_active, sort_order, click_count, metadata"
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(100),
    supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("status", "published")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return {
    settings: (settingsRes.data as StoreSettings | null) ?? DEFAULT_STORE_SETTINGS,
    blocks: (blocksRes.data as BioBlock[] | null) ?? [],
    products: (productsRes.data as Product[] | null) ?? [],
    isDemoMode: false,
  };
}

export async function getProductBySlug(slug: string): Promise<{
  product: Product | null;
  variants: ProductVariant[];
  courseSections: CourseSection[];
  availability: AppointmentAvailability[];
  orderBumpProduct: Product | null;
  recentDonations: Array<{
    id: string;
    supporter_name: string;
    is_anonymous: boolean;
    message: string | null;
    amount: number;
    created_at: string;
  }>;
  settings: StoreSettings;
  isDemoMode: boolean;
}> {
  if (!isSupabaseServerConfigured()) {
    const product = DEMO_PRODUCTS.find((p) => p.slug === slug) ?? null;
    const orderBumpProduct = product?.order_bump_product_id
      ? DEMO_PRODUCTS.find((p) => p.id === product.order_bump_product_id) ?? null
      : null;

    return {
      product,
      variants: product ? DEMO_VARIANTS[product.id] ?? [] : [],
      courseSections: product ? DEMO_COURSE_SECTIONS[product.id] ?? [] : [],
      availability:
        product?.type === "appointment"
          ? [1, 2, 3, 4, 5].map((day) => ({
              id: `avail-${day}`,
              product_id: product.id,
              day_of_week: day,
              start_time: "09:00",
              end_time: "17:00",
              is_active: true,
            }))
          : [],
      orderBumpProduct,
      recentDonations:
        product?.type === "donation"
          ? [
              {
                id: "don-1",
                supporter_name: "Raka Pratama",
                is_anonymous: false,
                message: "Terima kasih kontennya selalu daging dan praktis!",
                amount: 50000,
                created_at: new Date().toISOString(),
              },
              {
                id: "don-2",
                supporter_name: "Anonim",
                is_anonymous: true,
                message: "Semangat terus berkarya.",
                amount: 25000,
                created_at: new Date().toISOString(),
              },
            ]
          : [],
      settings: DEFAULT_STORE_SETTINGS,
      isDemoMode: true,
    };
  }

  const supabase = await createServerSupabaseClient();
  const [settingsRes, productRes] = await Promise.all([
    supabase
      .from("store_settings")
      .select(
        "id, brand_name, handle, tagline, bio, avatar_url, verified_badge, theme_config, social_links, seo_config, pixels_config, shipping_options, default_affiliate_commission_pct, affiliate_auto_approve, updated_at"
      )
      .eq("singleton_key", "primary")
      .single(),
    supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("slug", slug)
      .eq("status", "published")
      .single(),
  ]);

  const settings = (settingsRes.data as StoreSettings | null) ?? DEFAULT_STORE_SETTINGS;
  const product = (productRes.data as Product | null) ?? null;

  if (!product) {
    return {
      product: null,
      variants: [],
      courseSections: [],
      availability: [],
      orderBumpProduct: null,
      recentDonations: [],
      settings,
      isDemoMode: false,
    };
  }

  const [variantsRes, sectionsRes, lessonsRes, availRes, bumpRes, donationsRes] =
    await Promise.all([
      product.type === "physical"
        ? supabase
            .from("product_variants")
            .select(
              "id, product_id, name, sku, price_override, stock_quantity, weight_grams, is_active"
            )
            .eq("product_id", product.id)
            .eq("is_active", true)
            .limit(50)
        : Promise.resolve({ data: [] }),
      product.type === "course"
        ? supabase
            .from("course_sections")
            .select("id, product_id, title, sort_order")
            .eq("product_id", product.id)
            .order("sort_order", { ascending: true })
            .limit(100)
        : Promise.resolve({ data: [] }),
      product.type === "course"
        ? supabase
            .from("course_lessons")
            .select(
              "id, section_id, product_id, title, content_type, video_url, body_markdown, attachment_path, duration_minutes, is_free_preview, sort_order"
            )
            .eq("product_id", product.id)
            .order("sort_order", { ascending: true })
            .limit(300)
        : Promise.resolve({ data: [] }),
      product.type === "appointment"
        ? supabase
            .from("appointment_availability")
            .select("id, product_id, day_of_week, start_time, end_time, is_active")
            .eq("product_id", product.id)
            .eq("is_active", true)
        : Promise.resolve({ data: [] }),
      product.order_bump_product_id
        ? supabase
            .from("products")
            .select(PRODUCT_COLUMNS)
            .eq("id", product.order_bump_product_id)
            .eq("status", "published")
            .single()
        : Promise.resolve({ data: null }),
      product.type === "donation"
        ? supabase
            .from("donations")
            .select("id, supporter_name, is_anonymous, message, amount, created_at")
            .eq("product_id", product.id)
            .eq("is_visible", true)
            .order("created_at", { ascending: false })
            .limit(12)
        : Promise.resolve({ data: [] }),
    ]);

  // Assemble sections + lessons without N+1 queries
  const lessonsBySection = new Map<string, CourseLesson[]>();
  for (const lesson of (lessonsRes.data as CourseLesson[] | null) ?? []) {
    const existing = lessonsBySection.get(lesson.section_id) ?? [];
    existing.push(lesson);
    lessonsBySection.set(lesson.section_id, existing);
  }

  const courseSections: CourseSection[] = (
    (sectionsRes.data as CourseSection[] | null) ?? []
  ).map((sec) => ({
    ...sec,
    lessons: lessonsBySection.get(sec.id) ?? [],
  }));

  return {
    product,
    variants: (variantsRes.data as ProductVariant[] | null) ?? [],
    courseSections,
    availability: (availRes.data as AppointmentAvailability[] | null) ?? [],
    orderBumpProduct: (bumpRes.data as Product | null) ?? null,
    recentDonations:
      (donationsRes.data as Array<{
        id: string;
        supporter_name: string;
        is_anonymous: boolean;
        message: string | null;
        amount: number;
        created_at: string;
      }> | null) ?? [],
    settings,
    isDemoMode: false,
  };
}
