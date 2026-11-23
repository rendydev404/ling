"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  ArrowUpRight,
  Flame,
  LayoutGrid,
  List,
  PackageOpen,
  ShoppingBag,
  Sparkles,
  Zap,
} from "lucide-react";
import type { Product, ProductType, StoreSettings } from "@/types/database";
import { cn, formatIDR } from "@/lib/utils";
import { PRODUCT_TYPE_META, ProductTypeIcon } from "./product-type-meta";
import { CustomSearchInput } from "@/components/ui/input";

type SortMode = "featured" | "newest" | "price-asc" | "price-desc";
type ViewMode = "grid" | "list";

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

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: "featured", label: "Unggulan" },
  { value: "newest", label: "Terbaru" },
  { value: "price-asc", label: "Termurah" },
  { value: "price-desc", label: "Termahal" },
];

function getTypePerksLabel(product: Product): string {
  switch (product.type) {
    case "digital":
      return "Unduh Instan";
    case "course":
      return "Materi Terstruktur";
    case "appointment":
      return "Pilih Slot Jadwal";
    case "event":
      return "E-Ticket Resmi";
    case "physical":
      return "Dikirim Kurir";
    case "membership":
      return "Akses Komunitas";
    case "donation":
      return "Nominal Sukarela";
  }
}

function getPosterBg(type: ProductType): string {
  switch (type) {
    case "digital":
      return "bg-[#67e8f9]";
    case "course":
      return "bg-[#d8b4fe]";
    case "appointment":
      return "bg-[#fde047]";
    case "event":
      return "bg-[#c084fc]";
    case "physical":
      return "bg-[#a5f3fc]";
    case "membership":
      return "bg-[#f0abfc]";
    case "donation":
      return "bg-[#fda4af]";
  }
}

function formatProductPrice(product: Product): string {
  if (product.type === "donation" || product.is_pay_what_you_want) {
    return `Mulai ${formatIDR(product.min_price || product.price)}`;
  }
  if (product.price === 0) {
    return "Gratis";
  }
  return formatIDR(product.price);
}

export function ProductCatalogShowcase({
  products,
  theme,
  onProductClick,
}: {
  products: Product[];
  theme: StoreSettings["theme_config"];
  onProductClick?: (productId: string) => void;
}) {
  const [selectedType, setSelectedType] = React.useState<"all" | ProductType>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortMode, setSortMode] = React.useState<SortMode>("featured");
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid");

  const secondaryAccent = theme.secondaryAccentColor || "#a855f7";

  const countsByType = React.useMemo(() => {
    const map: Record<string, number> = { all: products.length };
    for (const p of products) {
      map[p.type] = (map[p.type] ?? 0) + 1;
    }
    return map;
  }, [products]);

  const spotlightProduct = React.useMemo(() => {
    if (selectedType !== "all" || searchQuery.trim()) return null;
    return products.find((p) => p.is_featured) ?? null;
  }, [products, selectedType, searchQuery]);

  const filteredProducts = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = products.filter((p) => {
      const matchType = selectedType === "all" || p.type === selectedType;
      const matchQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.short_description ?? "").toLowerCase().includes(q);
      return matchType && matchQuery;
    });

    return [...list].sort((a, b) => {
      if (sortMode === "price-asc") return a.price - b.price;
      if (sortMode === "price-desc") return b.price - a.price;
      if (sortMode === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [products, selectedType, searchQuery, sortMode]);

  return (
    <div className="space-y-5">
      {/* SPOTLIGHT FEATURED BANNER */}
      {spotlightProduct && (
        <div
          className="relative overflow-hidden rounded-2xl border-2 border-[#0f172a] bg-white shadow-[6px_6px_0px_#0f172a]"
        >
          <div className="grid grid-cols-1 md:grid-cols-12">
            {/* Visual Left Poster */}
            <div
              className={cn(
                "relative flex min-h-44 md:col-span-5 items-center justify-center border-b-2 md:border-b-0 md:border-r-2 border-[#0f172a] p-6 overflow-hidden",
                getPosterBg(spotlightProduct.type)
              )}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-20"
                style={{
                  backgroundImage: "radial-gradient(#0f172a 1.5px, transparent 1.5px)",
                  backgroundSize: "14px 14px",
                }}
              />
              {spotlightProduct.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={spotlightProduct.thumbnail_url}
                  alt={spotlightProduct.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-[#0f172a] bg-white text-[#0f172a] shadow-[4px_4px_0px_#0f172a] -rotate-3">
                  <ProductTypeIcon type={spotlightProduct.type} className="h-9 w-9" />
                </div>
              )}
              <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-lg border-2 border-[#0f172a] bg-[#fde047] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#0f172a] shadow-[2px_2px_0px_#0f172a]">
                <Sparkles className="h-3 w-3" />
                Sorotan Utama
              </span>
            </div>

            {/* Right Info */}
            <div className="md:col-span-7 p-5 sm:p-6 flex flex-col justify-between gap-4 bg-white">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="rounded-md border-2 border-[#0f172a] bg-[#ecfeff] px-2 py-0.5 text-[10px] font-black uppercase text-[#0f172a]">
                    {PRODUCT_TYPE_META[spotlightProduct.type].label}
                  </span>
                  {spotlightProduct.compare_at_price &&
                    spotlightProduct.compare_at_price > spotlightProduct.price && (
                      <span className="rounded-md border-2 border-[#0f172a] bg-[#fda4af] px-2 py-0.5 text-[10px] font-black uppercase text-[#0f172a]">
                        Hemat{" "}
                        {Math.round(
                          ((spotlightProduct.compare_at_price - spotlightProduct.price) /
                            spotlightProduct.compare_at_price) *
                            100
                        )}
                        %
                      </span>
                    )}
                </div>

                <Link
                  href={`/p/${spotlightProduct.slug}`}
                  onClick={() => onProductClick?.(spotlightProduct.id)}
                  className="text-lg sm:text-xl font-black text-[#0f172a] hover:underline leading-snug block"
                >
                  {spotlightProduct.title}
                </Link>
                {spotlightProduct.short_description && (
                  <p className="mt-1.5 text-xs sm:text-sm font-medium text-[#475569] line-clamp-2 leading-relaxed">
                    {spotlightProduct.short_description}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-[#0f172a] pt-3.5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">
                     Penawaran Spesial
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg sm:text-xl font-black text-[#0f172a]">
                      {formatProductPrice(spotlightProduct)}
                    </span>
                    {spotlightProduct.compare_at_price &&
                      spotlightProduct.compare_at_price > spotlightProduct.price && (
                        <span className="text-xs font-bold text-[#94a3b8] line-through">
                          {formatIDR(spotlightProduct.compare_at_price)}
                        </span>
                      )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/p/${spotlightProduct.slug}`}
                    onClick={() => onProductClick?.(spotlightProduct.id)}
                    className="inline-flex h-10 items-center rounded-xl border-2 border-[#0f172a] bg-white px-3.5 text-xs font-black text-[#0f172a] shadow-[2px_2px_0px_#0f172a] transition-all hover:bg-[#f4f8fb]"
                  >
                    Detail
                  </Link>
                  <Link
                    href={`/checkout/${spotlightProduct.slug}`}
                    onClick={() => onProductClick?.(spotlightProduct.id)}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border-2 border-[#0f172a] px-4 text-xs font-black text-white shadow-[3px_3px_0px_#0f172a] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                    style={{ backgroundColor: secondaryAccent }}
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    Ambil Sekarang
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DISCOVERY & FILTER CONTROL PANEL */}
      <div className="rounded-2xl border-2 border-[#0f172a] bg-white p-3.5 sm:p-4 shadow-[4px_4px_0px_#0f172a] space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1">
            <CustomSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari produk digital, kelas, sesi 1-on-1, tiket event..."
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            {/* Sort Pills */}
            <div className="inline-flex items-center gap-1 rounded-xl border-2 border-[#0f172a] bg-[#f4f8fb] px-2.5 h-10">
              <ArrowUpDown className="h-3.5 w-3.5 text-[#0f172a] shrink-0" />
              <select
                aria-label="Urutkan produk"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="bg-transparent text-xs font-black text-[#0f172a] focus:outline-none cursor-pointer pr-1"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Grid vs List Toggle */}
            <div className="inline-flex rounded-xl border-2 border-[#0f172a] bg-[#f4f8fb] p-0.5 h-10 items-center">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Tampilan Grid"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-all cursor-pointer",
                  viewMode === "grid"
                    ? "bg-[#22d3ee] text-[#0f172a] border border-[#0f172a]"
                    : "text-[#64748b] hover:text-[#0f172a]"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-label="Tampilan List"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-all cursor-pointer",
                  viewMode === "list"
                    ? "bg-[#22d3ee] text-[#0f172a] border border-[#0f172a]"
                    : "text-[#64748b] hover:text-[#0f172a]"
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {FILTER_TYPES.map((f) => {
            const count = countsByType[f.value] ?? 0;
            if (f.value !== "all" && count === 0 && products.length > 0) return null;
            const active = selectedType === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setSelectedType(f.value)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-[#0f172a] px-3 py-1.5 text-xs font-black transition-all cursor-pointer",
                  active
                    ? "bg-[#22d3ee] text-[#0f172a] shadow-[2px_2px_0px_#0f172a] -translate-y-0.5"
                    : "bg-white text-[#334155] hover:bg-[#f3e8ff] hover:text-[#0f172a]"
                )}
              >
                {f.value !== "all" && (
                  <ProductTypeIcon type={f.value} className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>{f.label}</span>
                <span
                  className={cn(
                    "rounded-md border border-[#0f172a] px-1.5 py-0.2 text-[10px] font-black",
                    active ? "bg-white text-[#0f172a]" : "bg-[#f4f8fb] text-[#475569]"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* PRODUCT CARDS */}
      {filteredProducts.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#0f172a] bg-white p-10 text-center shadow-[4px_4px_0px_#0f172a]">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#0f172a] bg-[#ecfeff] text-[#0f172a] shadow-[3px_3px_0px_#0f172a]">
            <PackageOpen className="h-6 w-6" />
          </div>
          <p className="text-sm font-black text-[#0f172a]">
            {products.length === 0
              ? "Katalog produk masih kosong"
              : "Tidak ada produk yang cocok"}
          </p>
          <p className="mt-1 text-xs font-medium text-[#475569]">
            {products.length === 0
              ? "Produk & layanan terbaru akan segera hadir di halaman ini."
              : "Coba ubah kata kunci pencarian atau pilih kategori lainnya."}
          </p>
          {selectedType !== "all" || searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSelectedType("all");
                setSearchQuery("");
              }}
              className="mt-4 inline-flex items-center rounded-xl border-2 border-[#0f172a] bg-[#22d3ee] px-4 py-2 text-xs font-black text-[#0f172a] shadow-[3px_3px_0px_#0f172a] cursor-pointer"
            >
              Reset Filter
            </button>
          ) : null}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredProducts.map((product) => {
            const meta = PRODUCT_TYPE_META[product.type];
            const discountPct =
              product.compare_at_price && product.compare_at_price > product.price
                ? Math.round(
                    ((product.compare_at_price - product.price) / product.compare_at_price) *
                      100
                  )
                : 0;

            return (
              <article
                key={product.id}
                className="group flex flex-col overflow-hidden rounded-2xl border-2 border-[#0f172a] bg-white shadow-[4px_4px_0px_#0f172a] transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#0f172a]"
              >
                {/* Visual Poster Cover */}
                <Link
                  href={`/p/${product.slug}`}
                  onClick={() => onProductClick?.(product.id)}
                  className={cn(
                    "relative flex h-40 w-full items-center justify-center overflow-hidden border-b-2 border-[#0f172a]",
                    getPosterBg(product.type)
                  )}
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: "radial-gradient(#0f172a 1.25px, transparent 1.25px)",
                      backgroundSize: "12px 12px",
                    }}
                  />
                  {product.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.thumbnail_url}
                      alt={product.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#0f172a] bg-white text-[#0f172a] shadow-[3px_3px_0px_#0f172a] transition-transform duration-200 group-hover:rotate-3 group-hover:scale-105">
                      <ProductTypeIcon type={product.type} className="h-7 w-7" />
                    </div>
                  )}

                  {/* Top-left Type Badge */}
                  <span
                    className={cn(
                      "absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-lg border-2 border-[#0f172a] px-2 py-0.5 text-[10px] font-black uppercase shadow-[2px_2px_0px_#0f172a]",
                      meta.accentBg,
                      meta.accentText
                    )}
                  >
                    <ProductTypeIcon type={product.type} className="h-3 w-3" />
                    {meta.shortLabel}
                  </span>

                  {/* Top-right Discount / Featured Sticker */}
                  {discountPct > 0 ? (
                    <span className="absolute top-2.5 right-2.5 rounded-lg border-2 border-[#0f172a] bg-[#fda4af] px-2 py-0.5 text-[10px] font-black uppercase text-[#0f172a] shadow-[2px_2px_0px_#0f172a]">
                      -{discountPct}%
                    </span>
                  ) : product.is_featured ? (
                    <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-0.5 rounded-lg border-2 border-[#0f172a] bg-[#fde047] px-2 py-0.5 text-[10px] font-black uppercase text-[#0f172a] shadow-[2px_2px_0px_#0f172a]">
                      <Sparkles className="h-2.5 w-2.5" />
                      Top
                    </span>
                  ) : null}
                </Link>

                {/* Card Body */}
                <div className="flex flex-1 flex-col justify-between p-4 gap-3.5">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <span className="inline-flex items-center gap-1 rounded-md border border-[#0f172a] bg-[#f4f8fb] px-2 py-0.5 text-[10px] font-extrabold text-[#334155]">
                        <Zap className="h-2.5 w-2.5 text-[#0891b2]" />
                        {getTypePerksLabel(product)}
                      </span>
                      {product.stock_quantity !== null && product.stock_quantity <= 25 && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-[#0f172a] bg-[#fef08a] px-2 py-0.5 text-[10px] font-extrabold text-[#0f172a]">
                          <Flame className="h-2.5 w-2.5 text-[#be123c]" />
                          Sisa {product.stock_quantity}
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/p/${product.slug}`}
                      onClick={() => onProductClick?.(product.id)}
                      className="text-sm sm:text-base font-black text-[#0f172a] leading-snug group-hover:underline line-clamp-2"
                    >
                      {product.title}
                    </Link>

                    {product.short_description && (
                      <p className="mt-1.5 text-xs font-medium text-[#475569] line-clamp-2 leading-relaxed">
                        {product.short_description}
                      </p>
                    )}
                  </div>

                  {/* Price & Dual Action Footer */}
                  <div className="border-t-2 border-[#0f172a] pt-3 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      {product.compare_at_price && product.compare_at_price > product.price && (
                        <p className="text-[11px] font-bold text-[#94a3b8] line-through leading-none mb-0.5">
                          {formatIDR(product.compare_at_price)}
                        </p>
                      )}
                      <p className="text-sm sm:text-base font-black text-[#0f172a] truncate">
                        {formatProductPrice(product)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link
                        href={`/p/${product.slug}`}
                        onClick={() => onProductClick?.(product.id)}
                        className="inline-flex h-8.5 items-center rounded-lg border-2 border-[#0f172a] bg-white px-2.5 text-[11px] font-black text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#f3e8ff] transition-colors"
                      >
                        Detail
                      </Link>
                      <Link
                        href={`/checkout/${product.slug}`}
                        onClick={() => onProductClick?.(product.id)}
                        className="inline-flex h-8.5 items-center gap-1 rounded-lg border-2 border-[#0f172a] bg-[#22d3ee] px-2.5 text-[11px] font-black text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#06b6d4] transition-colors"
                      >
                        <span>{product.type === "donation" ? "Dukung" : "Beli"}</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* COMPACT LIST VIEW */
        <div className="space-y-3">
          {filteredProducts.map((product) => {
            const meta = PRODUCT_TYPE_META[product.type];
            return (
              <div
                key={product.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-2xl border-2 border-[#0f172a] bg-white p-4 shadow-[4px_4px_0px_#0f172a] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#0f172a]"
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <Link
                    href={`/p/${product.slug}`}
                    onClick={() => onProductClick?.(product.id)}
                    className={cn(
                      "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-[#0f172a] overflow-hidden shadow-[2px_2px_0px_#0f172a]",
                      getPosterBg(product.type)
                    )}
                  >
                    {product.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.thumbnail_url}
                        alt={product.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ProductTypeIcon type={product.type} className="h-6 w-6 text-[#0f172a]" />
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span
                        className={cn(
                          "rounded-md border border-[#0f172a] px-2 py-0.5 text-[10px] font-black uppercase",
                          meta.accentBg,
                          meta.accentText
                        )}
                      >
                        {meta.label}
                      </span>
                      <span className="text-[11px] font-bold text-[#64748b]">
                        · {getTypePerksLabel(product)}
                      </span>
                    </div>
                    <Link
                      href={`/p/${product.slug}`}
                      onClick={() => onProductClick?.(product.id)}
                      className="text-sm sm:text-base font-black text-[#0f172a] group-hover:underline block truncate"
                    >
                      {product.title}
                    </Link>
                    {product.short_description && (
                      <p className="mt-0.5 text-xs font-medium text-[#475569] line-clamp-1">
                        {product.short_description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 border-t-2 sm:border-t-0 border-[#0f172a]/15 pt-2.5 sm:pt-0 shrink-0">
                  <div className="sm:text-right">
                    {product.compare_at_price && product.compare_at_price > product.price && (
                      <p className="text-[11px] font-bold text-[#94a3b8] line-through leading-none">
                        {formatIDR(product.compare_at_price)}
                      </p>
                    )}
                    <p className="text-sm sm:text-base font-black text-[#0f172a]">
                      {formatProductPrice(product)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/p/${product.slug}`}
                      onClick={() => onProductClick?.(product.id)}
                      className="inline-flex h-9 items-center rounded-xl border-2 border-[#0f172a] bg-white px-3 text-xs font-black text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#f3e8ff]"
                    >
                      Detail
                    </Link>
                    <Link
                      href={`/checkout/${product.slug}`}
                      onClick={() => onProductClick?.(product.id)}
                      className="inline-flex h-9 items-center gap-1 rounded-xl border-2 border-[#0f172a] bg-[#22d3ee] px-3.5 text-xs font-black text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#06b6d4]"
                    >
                      <span>{product.type === "donation" ? "Dukung" : "Beli"}</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
