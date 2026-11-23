"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  ExternalLink,
  Globe,
  Instagram,
  LayoutGrid,
  Linkedin,
  Link2,
  Mail,
  MessageCircle,
  Play,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  Youtube,
  Zap,
} from "lucide-react";
import type { BioBlock, Product, SocialLinkItem, StoreSettings } from "@/types/database";
import { cn, formatIDR, getYouTubeEmbedUrl } from "@/lib/utils";
import { PRODUCT_TYPE_META, ProductTypeIcon } from "./product-type-meta";
import { ProductCatalogShowcase } from "./product-catalog-showcase";
import { BrandLogo } from "@/components/ui/brand-logo";
import { useToast } from "@/components/ui/custom-toast";

function SocialIcon({ platform }: { platform: SocialLinkItem["platform"] }) {
  switch (platform) {
    case "instagram":
      return <Instagram className="h-4 w-4" />;
    case "youtube":
      return <Youtube className="h-4 w-4" />;
    case "linkedin":
      return <Linkedin className="h-4 w-4" />;
    case "whatsapp":
      return <MessageCircle className="h-4 w-4" />;
    case "email":
      return <Mail className="h-4 w-4" />;
    case "tiktok":
      return <Play className="h-4 w-4" />;
    default:
      return <Globe className="h-4 w-4" />;
  }
}

function getRadiusClass(radius: StoreSettings["theme_config"]["buttonRadius"]): string {
  switch (radius) {
    case "none":
      return "rounded-none";
    case "md":
      return "rounded-xl";
    case "full":
      return "rounded-full";
    default:
      return "rounded-2xl";
  }
}

export function BioStorefront({
  settings,
  blocks,
  products,
}: {
  settings: StoreSettings;
  blocks: BioBlock[];
  products: Product[];
  isDemoMode?: boolean;
  isMidtransActive?: boolean;
}) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState<"shop" | "links">(
    blocks.length > 0 && products.length === 0 ? "links" : "shop"
  );

  const theme = settings.theme_config;
  const secondaryAccent = theme.secondaryAccentColor || "#a855f7";
  const radiusClass = getRadiusClass(theme.buttonRadius);

  const productMap = React.useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) {
      map.set(p.id, p);
    }
    return map;
  }, [products]);

  React.useEffect(() => {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: "page_view" }),
    }).catch(() => {});
  }, []);

  function trackClick(blockId?: string, productId?: string) {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "link_click",
        block_id: blockId ?? null,
        product_id: productId ?? null,
      }),
    }).catch(() => {});
  }

  async function handleSharePage() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast({ type: "success", title: "Tautan halaman disalin" });
    } catch {
      toast({ type: "info", title: "Salin URL dari address bar browser Anda" });
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col transition-colors"
      style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}
    >
      {/* Top Customer Utility Bar */}
      <header
        className="sticky top-0 z-30 border-b-2"
        style={{
          backgroundColor: theme.surfaceColor,
          borderColor: theme.borderColor,
        }}
      >
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-black text-sm tracking-tight">
            <BrandLogo size="sm" />
            <span className="truncate max-w-[140px] sm:max-w-none">@{settings.handle}</span>
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              href="/products"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border-2 px-3 text-xs font-black shadow-[2px_2px_0px_#0f172a] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
              style={{
                backgroundColor: theme.accentColor,
                borderColor: theme.borderColor,
                color: theme.accentTextColor,
              }}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Katalog</span>
            </Link>
            <Link
              href="/portal"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border-2 px-3 text-xs font-black shadow-[2px_2px_0px_#0f172a] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
              style={{
                backgroundColor: theme.surfaceColor,
                borderColor: theme.borderColor,
                color: theme.textColor,
              }}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Pesanan Saya</span>
            </Link>
            <Link
              href="/affiliate"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border-2 px-3 text-xs font-black shadow-[2px_2px_0px_#0f172a] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
              style={{
                backgroundColor: secondaryAccent,
                borderColor: theme.borderColor,
                color: "#ffffff",
              }}
            >
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Affiliate</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 pb-16 pt-6 sm:pt-8">
        {/* Clean Neobrutalist Window Hero Card (Zero Negative-Margin Overlap) */}
        <section
          className="overflow-hidden rounded-2xl sm:rounded-3xl border-2 shadow-[6px_6px_0px_#0f172a]"
          style={{
            backgroundColor: theme.surfaceColor,
            borderColor: theme.borderColor,
          }}
        >
          {/* Neobrutalist Window Top Strip */}
          <div
            className="flex items-center justify-between border-b-2 bg-[#67e8f9] px-4 sm:px-7 py-3"
            style={{ borderColor: theme.borderColor }}
          >
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border-2 border-[#0f172a] bg-[#a855f7]" />
              <span className="h-3 w-3 rounded-full border-2 border-[#0f172a] bg-[#fde047]" />
              <span className="h-3 w-3 rounded-full border-2 border-[#0f172a] bg-white" />
              <span className="ml-1.5 text-[11px] font-black uppercase tracking-wider text-[#0f172a]">
                Official Storefront
              </span>
            </div>

            <button
              type="button"
              onClick={handleSharePage}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border-2 border-[#0f172a] bg-white px-3 text-xs font-black text-[#0f172a] shadow-[2px_2px_0px_#0f172a] cursor-pointer transition-all hover:bg-[#f3e8ff] hover:-translate-x-0.5 hover:-translate-y-0.5"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Bagikan</span>
            </button>
          </div>

          {/* Main Identity Content */}
          <div className="p-5 sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-start gap-5">
              {/* Avatar / Official Brand Emblem */}
              <div className="shrink-0">
                {settings.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={settings.avatar_url}
                    alt={settings.brand_name}
                    className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-2 border-[#0f172a] bg-white object-cover shadow-[4px_4px_0px_#0f172a]"
                  />
                ) : (
                  <BrandLogo size="xl" />
                )}
              </div>

              {/* Brand Details */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0f172a]">
                        {settings.brand_name}
                      </h1>
                      {settings.verified_badge && (
                        <BadgeCheck
                          className="h-5 w-5 sm:h-6 sm:w-6 shrink-0"
                          style={{ color: secondaryAccent }}
                        />
                      )}
                    </div>

                    {settings.tagline && (
                      <span className="mt-2 inline-block rounded-lg border-2 border-[#0f172a] bg-[#f3e8ff] px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-[#0f172a] shadow-[2px_2px_0px_#0f172a]">
                        {settings.tagline}
                      </span>
                    )}
                  </div>

                  {/* Social Links */}
                  {settings.social_links.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {settings.social_links.map((item, idx) => (
                        <a
                          key={`${item.platform}-${idx}`}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={item.label || item.platform}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#0f172a] bg-white text-[#0f172a] shadow-[2px_2px_0px_#0f172a] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#ecfeff]"
                        >
                          <SocialIcon platform={item.platform} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <p
                  className="mt-3.5 max-w-2xl text-sm font-medium leading-relaxed"
                  style={{ color: theme.mutedTextColor }}
                >
                  {settings.bio}
                </p>

                {/* Trust Badges */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#0f172a] bg-[#ecfeff] px-2.5 py-1 text-[11px] font-extrabold text-[#0f172a]">
                    <Zap className="h-3.5 w-3.5 text-[#0891b2]" />
                    Akses Otomatis 24/7
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#0f172a] bg-[#f3e8ff] px-2.5 py-1 text-[11px] font-extrabold text-[#0f172a]">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#7e22ce]" />
                    QRIS, Virtual Account, & E-Wallet
                  </span>
                  {products.length > 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#0f172a] bg-[#fef08a] px-2.5 py-1 text-[11px] font-extrabold text-[#0f172a]">
                      <Sparkles className="h-3.5 w-3.5 text-[#0f172a]" />
                      {products.length} Produk & Layanan Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#0f172a] bg-[#fef08a] px-2.5 py-1 text-[11px] font-extrabold text-[#0f172a]">
                      <Sparkles className="h-3.5 w-3.5 text-[#0f172a]" />
                      Checkout Instan Terverifikasi
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tab Switcher (only shown if custom Bio Blocks also exist) */}
            {blocks.length > 0 && (
              <div className="mt-6 pt-5 border-t-2 border-[#0f172a]/15">
                <div className="inline-grid grid-cols-2 gap-1.5 rounded-xl border-2 border-[#0f172a] bg-[#f4f8fb] p-1.5 w-full sm:w-80 shadow-[3px_3px_0px_#0f172a]">
                  <button
                    type="button"
                    onClick={() => setActiveTab("shop")}
                    className={cn(
                      "inline-flex items-center justify-center gap-1.5 rounded-lg border-2 px-4 py-2 text-xs font-black transition-all cursor-pointer",
                      activeTab === "shop"
                        ? "border-[#0f172a] bg-[#22d3ee] text-[#0f172a] shadow-[2px_2px_0px_#0f172a]"
                        : "border-transparent text-[#475569] hover:text-[#0f172a]"
                    )}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Katalog ({products.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("links")}
                    className={cn(
                      "inline-flex items-center justify-center gap-1.5 rounded-lg border-2 px-4 py-2 text-xs font-black transition-all cursor-pointer",
                      activeTab === "links"
                        ? "border-[#0f172a] bg-[#a855f7] text-white shadow-[2px_2px_0px_#0f172a]"
                        : "border-transparent text-[#475569] hover:text-[#0f172a]"
                    )}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Tautan ({blocks.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* TAB 1: INTERACTIVE PRODUCT CATALOG SHOWCASE */}
        {(activeTab === "shop" || blocks.length === 0) && (
          <section className="mt-7">
            <ProductCatalogShowcase
              products={products}
              theme={theme}
              onProductClick={(productId) => trackClick(undefined, productId)}
            />
          </section>
        )}

        {/* TAB 2: BIO LINKS & BLOCKS */}
        {activeTab === "links" && blocks.length > 0 && (
          <section className="mx-auto mt-7 max-w-2xl space-y-3.5">
            {blocks.map((block) => {
              if (block.type === "heading") {
                return (
                  <h2
                    key={block.id}
                    className="pt-3 text-xs font-black uppercase tracking-widest"
                    style={{ color: theme.textColor }}
                  >
                    {block.title}
                  </h2>
                );
              }

              if (block.type === "divider") {
                return (
                  <hr
                    key={block.id}
                    className="my-4 border-t-2"
                    style={{ borderColor: theme.borderColor }}
                  />
                );
              }

              if (block.type === "text") {
                return (
                  <div
                    key={block.id}
                    className={cn(
                      "border-2 p-4 text-sm font-medium leading-relaxed shadow-[4px_4px_0px_#0f172a]",
                      radiusClass
                    )}
                    style={{
                      backgroundColor: theme.surfaceColor,
                      borderColor: theme.borderColor,
                      color: theme.mutedTextColor,
                    }}
                  >
                    {block.title && (
                      <p className="font-black mb-1" style={{ color: theme.textColor }}>
                        {block.title}
                      </p>
                    )}
                    <p>{block.subtitle}</p>
                  </div>
                );
              }

              if (block.type === "video" && block.url) {
                const embedUrl = getYouTubeEmbedUrl(block.url);
                if (!embedUrl) return null;
                return (
                  <div
                    key={block.id}
                    className={cn(
                      "overflow-hidden border-2 shadow-[4px_4px_0px_#0f172a]",
                      radiusClass
                    )}
                    style={{
                      backgroundColor: theme.surfaceColor,
                      borderColor: theme.borderColor,
                    }}
                  >
                    <div className="aspect-video w-full">
                      <iframe
                        src={embedUrl}
                        title={block.title || "Video"}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    {block.title && (
                      <div
                        className="border-t-2 px-4 py-2.5 text-xs font-black"
                        style={{ borderColor: theme.borderColor }}
                      >
                        {block.title}
                      </div>
                    )}
                  </div>
                );
              }

              if (block.type === "image" && block.image_url) {
                const content = (
                  <div
                    className={cn(
                      "overflow-hidden border-2 shadow-[4px_4px_0px_#0f172a]",
                      radiusClass
                    )}
                    style={{
                      backgroundColor: theme.surfaceColor,
                      borderColor: theme.borderColor,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={block.image_url}
                      alt={block.title || "Banner"}
                      className="w-full h-44 object-cover"
                    />
                    {block.title && (
                      <div
                        className="border-t-2 px-4 py-2.5 text-xs font-black"
                        style={{ borderColor: theme.borderColor }}
                      >
                        {block.title}
                      </div>
                    )}
                  </div>
                );
                return block.url ? (
                  <a
                    key={block.id}
                    href={block.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackClick(block.id)}
                    className="block"
                  >
                    {content}
                  </a>
                ) : (
                  <div key={block.id}>{content}</div>
                );
              }

              if (block.type === "product" && block.product_id) {
                const product = productMap.get(block.product_id);
                if (!product) return null;
                const meta = PRODUCT_TYPE_META[product.type];
                const isFeatured = block.layout_style === "featured";

                return (
                  <Link
                    key={block.id}
                    href={`/p/${product.slug}`}
                    onClick={() => trackClick(block.id, product.id)}
                    className={cn(
                      "group block border-2 shadow-[4px_4px_0px_#0f172a] transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#0f172a]",
                      radiusClass,
                      isFeatured ? "p-5" : "p-4"
                    )}
                    style={{
                      backgroundColor: theme.surfaceColor,
                      borderColor: theme.borderColor,
                    }}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={cn(
                          "flex shrink-0 items-center justify-center rounded-xl border-2 shadow-[2px_2px_0px_#0f172a]",
                          isFeatured ? "h-12 w-12" : "h-11 w-11",
                          meta.accentBg,
                          meta.accentText
                        )}
                        style={{ borderColor: theme.borderColor }}
                      >
                        <ProductTypeIcon type={product.type} className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md border border-[#0f172a] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide",
                              meta.accentBg,
                              meta.accentText
                            )}
                          >
                            {block.badge_text || meta.shortLabel}
                          </span>
                        </div>

                        <h3 className="text-sm font-black leading-snug group-hover:underline">
                          {product.title}
                        </h3>
                        {product.short_description && (
                          <p
                            className="mt-1 text-xs font-medium line-clamp-2 leading-relaxed"
                            style={{ color: theme.mutedTextColor }}
                          >
                            {product.short_description}
                          </p>
                        )}

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="text-sm font-black">
                            {product.type === "donation" || product.is_pay_what_you_want
                              ? `Mulai ${formatIDR(product.min_price || product.price)}`
                              : product.price === 0
                              ? "Gratis"
                              : formatIDR(product.price)}
                          </span>

                          <span
                            className="inline-flex items-center gap-1 rounded-lg border-2 px-2.5 py-1 text-[11px] font-black shadow-[2px_2px_0px_#0f172a]"
                            style={{
                              backgroundColor: isFeatured ? secondaryAccent : theme.accentColor,
                              color: isFeatured ? "#ffffff" : theme.accentTextColor,
                              borderColor: theme.borderColor,
                            }}
                          >
                            Lihat
                            <ArrowUpRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              }

              const isExternal = block.url?.startsWith("http");
              const linkClass = cn(
                "group flex items-center justify-between gap-3 border-2 px-4 py-3.5 shadow-[4px_4px_0px_#0f172a] transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#0f172a]",
                radiusClass
              );
              const inner = (
                <>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black truncate">{block.title}</span>
                      {block.badge_text && (
                        <span
                          className="rounded-md border border-[#0f172a] px-1.5 py-0.5 text-[10px] font-black"
                          style={{
                            backgroundColor: secondaryAccent,
                            color: "#ffffff",
                          }}
                        >
                          {block.badge_text}
                        </span>
                      )}
                    </div>
                    {block.subtitle && (
                      <p
                        className="mt-0.5 text-xs font-medium truncate"
                        style={{ color: theme.mutedTextColor }}
                      >
                        {block.subtitle}
                      </p>
                    )}
                  </div>
                  <ExternalLink
                    className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                    style={{ color: theme.textColor }}
                  />
                </>
              );

              if (isExternal) {
                return (
                  <a
                    key={block.id}
                    href={block.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackClick(block.id)}
                    className={linkClass}
                    style={{
                      backgroundColor: theme.surfaceColor,
                      borderColor: theme.borderColor,
                    }}
                  >
                    {inner}
                  </a>
                );
              }

              return (
                <Link
                  key={block.id}
                  href={block.url || "/"}
                  onClick={() => trackClick(block.id)}
                  className={linkClass}
                  style={{
                    backgroundColor: theme.surfaceColor,
                    borderColor: theme.borderColor,
                  }}
                >
                  {inner}
                </Link>
              );
            })}
          </section>
        )}
      </main>

      {/* Clean Sticky-Bottom Footer */}
      <footer
        className="border-t-2 bg-white py-5"
        style={{ borderColor: theme.borderColor, color: theme.mutedTextColor }}
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <BrandLogo size="xs" className="h-5 w-5" />
            <span className="font-black" style={{ color: theme.textColor }}>
              {settings.brand_name}
            </span>
          </div>
          <p className="text-center sm:text-right">
            Pembayaran instan didukung Midtrans (QRIS, Virtual Account, E-Wallet)
          </p>
        </div>
      </footer>
    </div>
  );
}
