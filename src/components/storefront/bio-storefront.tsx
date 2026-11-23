"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  ExternalLink,
  Globe,
  Instagram,
  LayoutDashboard,
  Linkedin,
  Mail,
  MessageCircle,
  Play,
  Share2,
  ShoppingBag,
  Sparkles,
  Users,
  Youtube,
} from "lucide-react";
import type { BioBlock, Product, ProductType, SocialLinkItem, StoreSettings } from "@/types/database";
import { cn, formatIDR, getYouTubeEmbedUrl } from "@/lib/utils";
import { PRODUCT_TYPE_META, ProductTypeIcon } from "./product-type-meta";
import { CustomSearchInput } from "@/components/ui/input";
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
      return "rounded-lg";
    case "full":
      return "rounded-full";
    default:
      return "rounded-2xl";
  }
}

const FILTER_TYPES: Array<{ value: "all" | ProductType; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "digital", label: "Digital" },
  { value: "course", label: "Kelas" },
  { value: "appointment", label: "1-on-1" },
  { value: "event", label: "Event" },
  { value: "physical", label: "Fisik" },
  { value: "membership", label: "Member" },
  { value: "donation", label: "Support" },
];

export function BioStorefront({
  settings,
  blocks,
  products,
  isDemoMode,
  isMidtransActive = false,
}: {
  settings: StoreSettings;
  blocks: BioBlock[];
  products: Product[];
  isDemoMode: boolean;
  isMidtransActive?: boolean;
}) {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = React.useState<"all" | ProductType>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"links" | "shop">("links");

  const theme = settings.theme_config;
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

  const filteredProducts = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchType = selectedType === "all" || p.type === selectedType;
      const matchQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.short_description ?? "").toLowerCase().includes(q);
      return matchType && matchQuery;
    });
  }, [products, selectedType, searchQuery]);

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
      className="min-h-screen transition-colors"
      style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}
    >
      {/* Top Minimal Utility Bar */}
      <header
        className="sticky top-0 z-30 border-b"
        style={{
          backgroundColor: theme.surfaceColor,
          borderColor: theme.borderColor,
        }}
      >
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-extrabold text-sm tracking-tight">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-extrabold"
              style={{ backgroundColor: theme.accentColor, color: theme.accentTextColor }}
            >
              {settings.brand_name.slice(0, 1).toUpperCase()}
            </span>
            <span>@{settings.handle}</span>
          </Link>

          <nav className="flex items-center gap-1.5">
            <Link
              href="/portal"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors hover:opacity-85"
              style={{ borderColor: theme.borderColor, color: theme.textColor }}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Pesanan Saya</span>
            </Link>
            <Link
              href="/affiliate"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors hover:opacity-85"
              style={{ borderColor: theme.borderColor, color: theme.textColor }}
            >
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Affiliate</span>
            </Link>
            <Link
              href="/admin"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors hover:opacity-90"
              style={{ backgroundColor: theme.accentColor, color: theme.accentTextColor }}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Admin</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-16 pt-8">
        {isDemoMode && (
          <div
            className="mb-6 flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-xs"
            style={{
              backgroundColor: theme.surfaceColor,
              borderColor: theme.borderColor,
              color: theme.mutedTextColor,
            }}
          >
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: theme.accentColor }} />
              <span>
                {isMidtransActive ? (
                  <>
                    Midtrans Aktif — sambungkan Supabase di <code>.env.local</code> untuk menyimpan produk & pesanan ke database.
                  </>
                ) : (
                  <>
                    Mode Pratinjau Aktif — sambungkan Supabase & Midtrans di <code>.env.local</code> untuk transaksi live.
                  </>
                )}
              </span>
            </span>
          </div>
        )}

        {/* Creator Profile Header */}
        <section className="flex flex-col items-center text-center">
          <div className="relative">
            {settings.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.avatar_url}
                alt={settings.brand_name}
                className="h-24 w-24 rounded-full border-2 object-cover"
                style={{ borderColor: theme.accentColor }}
              />
            ) : (
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full border-2 text-2xl font-extrabold"
                style={{
                  backgroundColor: theme.accentColor,
                  color: theme.accentTextColor,
                  borderColor: theme.borderColor,
                }}
              >
                {settings.brand_name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={handleSharePage}
              aria-label="Bagikan halaman"
              className="absolute -right-2 bottom-0 flex h-8 w-8 items-center justify-center rounded-full border shadow-xs cursor-pointer transition-transform hover:scale-105"
              style={{
                backgroundColor: theme.surfaceColor,
                borderColor: theme.borderColor,
                color: theme.textColor,
              }}
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-1.5">
            <h1 className="text-xl font-extrabold tracking-tight">{settings.brand_name}</h1>
            {settings.verified_badge && (
              <BadgeCheck className="h-5 w-5 shrink-0" style={{ color: theme.accentColor }} />
            )}
          </div>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider" style={{ color: theme.accentColor }}>
            {settings.tagline}
          </p>
          <p
            className="mt-2.5 max-w-md text-sm leading-relaxed"
            style={{ color: theme.mutedTextColor }}
          >
            {settings.bio}
          </p>

          {/* Social Links */}
          {settings.social_links.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {settings.social_links.map((item, idx) => (
                <a
                  key={`${item.platform}-${idx}`}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.label || item.platform}
                  className="flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: theme.surfaceColor,
                    borderColor: theme.borderColor,
                    color: theme.textColor,
                  }}
                >
                  <SocialIcon platform={item.platform} />
                </a>
              ))}
            </div>
          )}

          {/* Switcher: Bio Links vs Katalog Toko */}
          <div
            className="mt-6 inline-grid grid-cols-2 rounded-xl border p-1 w-full max-w-xs"
            style={{ backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("links")}
              className="rounded-lg py-2 text-xs font-bold transition-colors cursor-pointer"
              style={
                activeTab === "links"
                  ? { backgroundColor: theme.accentColor, color: theme.accentTextColor }
                  : { color: theme.mutedTextColor }
              }
            >
              Link & Sorotan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("shop")}
              className="rounded-lg py-2 text-xs font-bold transition-colors cursor-pointer"
              style={
                activeTab === "shop"
                  ? { backgroundColor: theme.accentColor, color: theme.accentTextColor }
                  : { color: theme.mutedTextColor }
              }
            >
              Semua Produk ({products.length})
            </button>
          </div>
        </section>

        {/* TAB 1: LINK-IN-BIO BLOCKS */}
        {activeTab === "links" && (
          <section className="mt-7 space-y-3.5">
            {blocks.map((block) => {
              if (block.type === "heading") {
                return (
                  <h2
                    key={block.id}
                    className="pt-3 text-xs font-extrabold uppercase tracking-widest"
                    style={{ color: theme.mutedTextColor }}
                  >
                    {block.title}
                  </h2>
                );
              }

              if (block.type === "divider") {
                return (
                  <hr
                    key={block.id}
                    className="my-4 border-t"
                    style={{ borderColor: theme.borderColor }}
                  />
                );
              }

              if (block.type === "text") {
                return (
                  <div
                    key={block.id}
                    className={cn("border p-4 text-sm leading-relaxed", radiusClass)}
                    style={{
                      backgroundColor: theme.surfaceColor,
                      borderColor: theme.borderColor,
                      color: theme.mutedTextColor,
                    }}
                  >
                    {block.title && (
                      <p className="font-bold mb-1" style={{ color: theme.textColor }}>
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
                    className={cn("overflow-hidden border", radiusClass)}
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
                      <div className="px-4 py-2.5 text-xs font-bold">{block.title}</div>
                    )}
                  </div>
                );
              }

              if (block.type === "image" && block.image_url) {
                const content = (
                  <div
                    className={cn("overflow-hidden border", radiusClass)}
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
                      <div className="px-4 py-2.5 text-xs font-bold">{block.title}</div>
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
                      "group block border transition-all duration-150 hover:-translate-y-0.5",
                      radiusClass,
                      isFeatured ? "p-5" : "p-4"
                    )}
                    style={{
                      backgroundColor: theme.surfaceColor,
                      borderColor: isFeatured ? theme.accentColor : theme.borderColor,
                    }}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={cn(
                          "flex shrink-0 items-center justify-center rounded-xl border",
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
                              "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                              meta.accentBg,
                              meta.accentText
                            )}
                          >
                            {block.badge_text || meta.shortLabel}
                          </span>
                          {product.compare_at_price && product.compare_at_price > product.price && (
                            <span className="rounded-md bg-[#fef2f2] px-1.5 py-0.5 text-[10px] font-bold text-[#dc2626]">
                              Hemat{" "}
                              {Math.round(
                                ((product.compare_at_price - product.price) /
                                  product.compare_at_price) *
                                  100
                              )}
                              %
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold leading-snug group-hover:underline">
                          {product.title}
                        </h3>
                        {product.short_description && (
                          <p
                            className="mt-1 text-xs line-clamp-2 leading-relaxed"
                            style={{ color: theme.mutedTextColor }}
                          >
                            {product.short_description}
                          </p>
                        )}

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div className="flex items-baseline gap-2">
                            <span
                              className="text-sm font-extrabold"
                              style={{ color: theme.accentColor }}
                            >
                              {product.type === "donation" || product.is_pay_what_you_want
                                ? `Mulai ${formatIDR(product.min_price || product.price)}`
                                : product.price === 0
                                ? "Gratis"
                                : formatIDR(product.price)}
                            </span>
                            {product.compare_at_price && product.compare_at_price > product.price && (
                              <span
                                className="text-xs line-through"
                                style={{ color: theme.mutedTextColor }}
                              >
                                {formatIDR(product.compare_at_price)}
                              </span>
                            )}
                          </div>

                          <span
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold"
                            style={{
                              backgroundColor: theme.accentColor,
                              color: theme.accentTextColor,
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

              // Standard Link Button
              const isExternal = block.url?.startsWith("http");
              const linkClass = cn(
                "group flex items-center justify-between gap-3 border px-4 py-3.5 transition-all duration-150 hover:-translate-y-0.5",
                radiusClass
              );
              const inner = (
                <>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold truncate">{block.title}</span>
                      {block.badge_text && (
                        <span
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                          style={{
                            backgroundColor: theme.accentColor,
                            color: theme.accentTextColor,
                          }}
                        >
                          {block.badge_text}
                        </span>
                      )}
                    </div>
                    {block.subtitle && (
                      <p
                        className="mt-0.5 text-xs truncate"
                        style={{ color: theme.mutedTextColor }}
                      >
                        {block.subtitle}
                      </p>
                    )}
                  </div>
                  <ExternalLink
                    className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                    style={{ color: theme.mutedTextColor }}
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

        {/* TAB 2: FULL SHOP CATALOG */}
        {activeTab === "shop" && (
          <section className="mt-6 space-y-4">
            <CustomSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari e-book, kelas, konsultasi, event..."
            />

            <div className="flex flex-wrap gap-1.5">
              {FILTER_TYPES.map((f) => {
                const active = selectedType === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setSelectedType(f.value)}
                    className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
                    style={
                      active
                        ? {
                            backgroundColor: theme.accentColor,
                            borderColor: theme.accentColor,
                            color: theme.accentTextColor,
                          }
                        : {
                            backgroundColor: theme.surfaceColor,
                            borderColor: theme.borderColor,
                            color: theme.textColor,
                          }
                    }
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              {filteredProducts.length === 0 ? (
                <div
                  className="rounded-2xl border p-8 text-center text-xs"
                  style={{
                    backgroundColor: theme.surfaceColor,
                    borderColor: theme.borderColor,
                    color: theme.mutedTextColor,
                  }}
                >
                  Tidak ada produk yang cocok dengan filter pencarian Anda.
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const meta = PRODUCT_TYPE_META[product.type];
                  return (
                    <Link
                      key={product.id}
                      href={`/p/${product.slug}`}
                      className={cn(
                        "flex items-start gap-3.5 border p-4 transition-all hover:-translate-y-0.5",
                        radiusClass
                      )}
                      style={{
                        backgroundColor: theme.surfaceColor,
                        borderColor: theme.borderColor,
                      }}
                    >
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                          meta.accentBg,
                          meta.accentText
                        )}
                      >
                        <ProductTypeIcon type={product.type} className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                            meta.accentBg,
                            meta.accentText
                          )}
                        >
                          {meta.label}
                        </span>
                        <h3 className="mt-1 text-sm font-bold">{product.title}</h3>
                        {product.short_description && (
                          <p
                            className="mt-0.5 text-xs line-clamp-2"
                            style={{ color: theme.mutedTextColor }}
                          >
                            {product.short_description}
                          </p>
                        )}
                        <div className="mt-2.5 flex items-center justify-between">
                          <span
                            className="text-sm font-extrabold"
                            style={{ color: theme.accentColor }}
                          >
                            {product.type === "donation" || product.is_pay_what_you_want
                              ? `Mulai ${formatIDR(product.min_price || product.price)}`
                              : formatIDR(product.price)}
                          </span>
                          <span className="text-xs font-semibold inline-flex items-center gap-1">
                            Detail <ArrowUpRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer
          className="mt-12 border-t pt-6 text-center text-xs"
          style={{ borderColor: theme.borderColor, color: theme.mutedTextColor }}
        >
          <p className="font-semibold">{settings.brand_name}</p>
          <p className="mt-1">Pembayaran aman didukung Midtrans (QRIS, Virtual Account, E-Wallet)</p>
        </footer>
      </main>
    </div>
  );
}
