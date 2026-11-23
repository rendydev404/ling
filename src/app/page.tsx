import type { Metadata } from "next";
import { getStorefrontBundle } from "@/lib/storefront-data";
import { BioStorefront } from "@/components/storefront/bio-storefront";
import { PixelScripts } from "@/components/marketing/pixel-scripts";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getStorefrontBundle();
  return {
    title: settings.seo_config.metaTitle || `${settings.brand_name} — Storefront`,
    description: settings.seo_config.metaDescription || settings.bio,
  };
}

export default async function HomePage() {
  const { settings, blocks, products, isDemoMode } = await getStorefrontBundle();

  return (
    <>
      <PixelScripts pixels={settings.pixels_config} />
      <BioStorefront
        settings={settings}
        blocks={blocks}
        products={products}
        isDemoMode={isDemoMode}
      />
    </>
  );
}
