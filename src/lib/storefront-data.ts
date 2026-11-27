import { cache } from "react";
import { unstable_cache } from "next/cache";
import { DEFAULT_STORE_SETTINGS } from "./demo-data";
import {
  createPublicSupabaseClient,
  isSupabaseServerConfigured,
} from "./supabase/server";
import type {
  AppointmentAvailability,
  BioBlock,
  CourseLesson,
  CourseSection,
  Product,
  ProductVariant,
  StoreSettings,
} from "@/types/database";

const SETTINGS_COLUMNS =
  "id, brand_name, handle, tagline, bio, avatar_url, verified_badge, theme_config, social_links, seo_config, pixels_config, shipping_options, default_affiliate_commission_pct, affiliate_auto_approve, updated_at";

const PRODUCT_COLUMNS =
  "id, slug, type, title, short_description, description, thumbnail_url, gallery_urls, price, compare_at_price, is_pay_what_you_want, min_price, status, is_featured, stock_quantity, order_bump_product_id, order_bump_price, order_bump_headline, affiliate_enabled, affiliate_commission_pct, metadata, created_at, updated_at";

const fetchCachedStoreSettings = unstable_cache(
  async (): Promise<{ settings: StoreSettings; isDemoMode: boolean }> => {
    const supabase = createPublicSupabaseClient();
    if (!supabase) {
      return { settings: DEFAULT_STORE_SETTINGS, isDemoMode: true };
    }

    const { data, error } = await supabase
      .from("store_settings")
      .select(SETTINGS_COLUMNS)
      .eq("singleton_key", "primary")
      .single();

    if (error?.code === "PGRST205" || !data) {
      return { settings: DEFAULT_STORE_SETTINGS, isDemoMode: false };
    }

    return { settings: data as StoreSettings, isDemoMode: false };
  },
  ["store-settings-v1"],
  { revalidate: 3600, tags: ["storefront", "settings"] }
);

export const getStoreSettings = cache(async () => {
  if (!isSupabaseServerConfigured()) {
    return { settings: DEFAULT_STORE_SETTINGS, isDemoMode: true };
  }
  return fetchCachedStoreSettings();
});

const fetchCachedStorefrontBundle = unstable_cache(
  async (): Promise<{
    settings: StoreSettings;
    blocks: BioBlock[];
    products: Product[];
    isDemoMode: boolean;
  }> => {
    const supabase = createPublicSupabaseClient();
    if (!supabase) {
      return {
        settings: DEFAULT_STORE_SETTINGS,
        blocks: [],
        products: [],
        isDemoMode: true,
      };
    }

    const [settingsRes, blocksRes, productsRes] = await Promise.all([
      supabase
        .from("store_settings")
        .select(SETTINGS_COLUMNS)
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

    if (productsRes.error?.code === "PGRST205" || settingsRes.error?.code === "PGRST205") {
      return {
        settings: DEFAULT_STORE_SETTINGS,
        blocks: [],
        products: [],
        isDemoMode: false,
      };
    }

    return {
      settings: (settingsRes.data as StoreSettings | null) ?? DEFAULT_STORE_SETTINGS,
      blocks: (blocksRes.data as BioBlock[] | null) ?? [],
      products: (productsRes.data as Product[] | null) ?? [],
      isDemoMode: false,
    };
  },
  ["storefront-bundle-v1"],
  { revalidate: 3600, tags: ["storefront", "settings", "products", "blocks"] }
);

export const getStorefrontBundle = cache(async () => {
  if (!isSupabaseServerConfigured()) {
    return {
      settings: DEFAULT_STORE_SETTINGS,
      blocks: [],
      products: [],
      isDemoMode: true,
    };
  }
  return fetchCachedStorefrontBundle();
});

const fetchCachedProductBySlug = unstable_cache(
  async (
    slug: string
  ): Promise<{
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
  }> => {
    const supabase = createPublicSupabaseClient();
    if (!supabase) {
      return {
        product: null,
        variants: [],
        courseSections: [],
        availability: [],
        orderBumpProduct: null,
        recentDonations: [],
        settings: DEFAULT_STORE_SETTINGS,
        isDemoMode: true,
      };
    }

    const [{ settings }, productRes] = await Promise.all([
      fetchCachedStoreSettings(),
      supabase.from("products").select(PRODUCT_COLUMNS).eq("slug", slug).single(),
    ]);

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

    const needsExtraQueries =
      product.type === "physical" ||
      product.type === "course" ||
      product.type === "appointment" ||
      product.type === "donation" ||
      Boolean(product.order_bump_product_id);

    if (!needsExtraQueries) {
      return {
        product,
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
              .select("id, product_id, name, sku, price_override, stock_quantity, weight_grams, is_active")
              .eq("product_id", product.id)
              .eq("is_active", true)
          : Promise.resolve({ data: [] }),
        product.type === "course"
          ? supabase
              .from("course_sections")
              .select("id, product_id, title, sort_order")
              .eq("product_id", product.id)
              .order("sort_order", { ascending: true })
          : Promise.resolve({ data: [] }),
        product.type === "course"
          ? supabase
              .from("course_lessons")
              .select(
                "id, section_id, product_id, title, content_type, video_url, body_markdown, duration_minutes, is_free_preview, sort_order"
              )
              .eq("product_id", product.id)
              .order("sort_order", { ascending: true })
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
              .single()
          : Promise.resolve({ data: null }),
        product.type === "donation"
          ? supabase
              .from("donations")
              .select("id, supporter_name, is_anonymous, message, amount, created_at")
              .eq("product_id", product.id)
              .eq("is_visible", true)
              .order("created_at", { ascending: false })
              .limit(10)
          : Promise.resolve({ data: [] }),
      ]);

    const lessons = (lessonsRes.data as CourseLesson[] | null) ?? [];
    const courseSections: CourseSection[] = (
      (sectionsRes.data as CourseSection[] | null) ?? []
    ).map((sec) => ({
      ...sec,
      lessons: lessons.filter((l) => l.section_id === sec.id),
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
  },
  ["product-by-slug-v1"],
  { revalidate: 3600, tags: ["storefront", "products", "settings"] }
);

export const getProductBySlug = cache(async (slug: string) => {
  if (!isSupabaseServerConfigured()) {
    return {
      product: null,
      variants: [],
      courseSections: [],
      availability: [],
      orderBumpProduct: null,
      recentDonations: [],
      settings: DEFAULT_STORE_SETTINGS,
      isDemoMode: true,
    };
  }
  return fetchCachedProductBySlug(slug);
});
