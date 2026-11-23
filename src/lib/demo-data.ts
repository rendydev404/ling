import type {
  BioBlock,
  CourseSection,
  Product,
  ProductVariant,
  StoreSettings,
} from "@/types/database";

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  id: "primary-store-settings",
  brand_name: "Ling Store",
  handle: "lingstore",
  tagline: "Produk Digital, Kelas Online & Konsultasi",
  bio: "Selamat datang di halaman resmi kami. Pilih produk, kelas, atau layanan di bawah ini.",
  avatar_url: null,
  verified_badge: true,
  theme_config: {
    preset: "neo-cyan",
    backgroundColor: "#f4f8fb",
    surfaceColor: "#ffffff",
    borderColor: "#0f172a",
    textColor: "#0f172a",
    mutedTextColor: "#334155",
    accentColor: "#22d3ee",
    accentTextColor: "#0f172a",
    secondaryAccentColor: "#a855f7",
    buttonRadius: "md",
  },
  social_links: [],
  seo_config: {
    metaTitle: "Ling Store — Official Storefront",
    metaDescription:
      "Produk digital, kelas online, konsultasi 1-on-1, event, dan membership resmi.",
    ogImageUrl: "",
  },
  pixels_config: {
    metaPixelId: "",
    tiktokPixelId: "",
    ga4MeasurementId: "",
  },
  shipping_options: [
    { code: "jne-reg", name: "JNE Reguler", estimatedDays: "2-4 hari", cost: 18000 },
    { code: "jnt-exp", name: "J&T Express", estimatedDays: "2-3 hari", cost: 20000 },
    { code: "sicepat", name: "SiCepat BEST", estimatedDays: "1-2 hari", cost: 25000 },
  ],
  default_affiliate_commission_pct: 20,
  affiliate_auto_approve: true,
  updated_at: "2026-01-01T00:00:00.000Z",
};

export const DEMO_PRODUCTS: Product[] = [];
export const DEMO_BIO_BLOCKS: BioBlock[] = [];
export const DEMO_VARIANTS: Record<string, ProductVariant[]> = {};
export const DEMO_COURSE_SECTIONS: Record<string, CourseSection[]> = {};
