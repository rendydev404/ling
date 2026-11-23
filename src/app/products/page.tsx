import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, Sparkles, Users } from "lucide-react";
import { getStorefrontBundle } from "@/lib/storefront-data";
import { ProductCatalogShowcase } from "@/components/storefront/product-catalog-showcase";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getStorefrontBundle();
  return {
    title: `Katalog Produk — ${settings.brand_name}`,
    description: settings.seo_config.metaDescription || settings.bio,
  };
}

export default async function CustomerProductsPage() {
  const { settings, products } = await getStorefrontBundle();
  const theme = settings.theme_config;
  const secondaryAccent = theme.secondaryAccentColor || "#a855f7";

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}
    >
      <header
        className="sticky top-0 z-30 border-b-2"
        style={{ backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }}
      >
        <div className="mx-auto flex h-15 max-w-5xl items-center justify-between px-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-[#0f172a] bg-white px-3 py-1.5 text-xs font-black text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#ecfeff]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{settings.brand_name}</span>
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              href="/portal"
              className="inline-flex h-8.5 items-center gap-1.5 rounded-xl border-2 border-[#0f172a] bg-white px-3 text-xs font-black text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#ecfeff]"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Pesanan</span>
            </Link>
            <Link
              href="/affiliate"
              className="inline-flex h-8.5 items-center gap-1.5 rounded-xl border-2 border-[#0f172a] px-3 text-xs font-black text-white shadow-[2px_2px_0px_#0f172a]"
              style={{ backgroundColor: secondaryAccent }}
            >
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Affiliate</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-7 sm:py-9 space-y-6">
        {/* Katalog Header Banner */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-[#0f172a] bg-[#67e8f9] p-6 sm:p-8 shadow-[6px_6px_0px_#0f172a]">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage: "radial-gradient(#0f172a 1.5px, transparent 1.5px)",
              backgroundSize: "14px 14px",
            }}
          />
          <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#0f172a] bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#0f172a] shadow-[2px_2px_0px_#0f172a]">
                <Sparkles className="h-3 w-3 text-[#7e22ce]" />
                Official Storefront
              </span>
              <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-[#0f172a]">
                Eksplorasi Produk & Layanan
              </h1>
              <p className="mt-1.5 max-w-xl text-xs sm:text-sm font-semibold text-[#0f172a]/80">
                Pilih produk digital, kelas online, sesi 1-on-1, hingga tiket event resmi dari{" "}
                <strong>{settings.brand_name}</strong> dengan akses otomatis setelah pembayaran.
              </p>
            </div>

            <div className="shrink-0 rounded-2xl border-2 border-[#0f172a] bg-white px-4 py-2.5 shadow-[3px_3px_0px_#0f172a]">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">
                Total Katalog
              </p>
              <p className="text-lg font-black text-[#0f172a]">{products.length} Produk</p>
            </div>
          </div>
        </div>

        <ProductCatalogShowcase products={products} theme={theme} />
      </main>
    </div>
  );
}
