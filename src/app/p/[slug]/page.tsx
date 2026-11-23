import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  MapPin,
  PlayCircle,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react";
import { getProductBySlug } from "@/lib/storefront-data";
import { formatDateTimeID, formatIDR } from "@/lib/utils";
import { PRODUCT_TYPE_META, ProductTypeIcon } from "@/components/storefront/product-type-meta";
import { PixelScripts } from "@/components/marketing/pixel-scripts";
import { Badge, Card } from "@/components/ui/controls";

export const revalidate = 60;

const WEEKDAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const {
    product,
    variants,
    courseSections,
    availability,
    orderBumpProduct,
    recentDonations,
    settings,
  } = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const meta = PRODUCT_TYPE_META[product.type];
  const discountPct =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round(
          ((product.compare_at_price - product.price) / product.compare_at_price) * 100
        )
      : 0;

  return (
    <div className="min-h-screen text-[#0f172a]">
      <PixelScripts pixels={settings.pixels_config} />

      <header className="sticky top-0 z-20 border-b-2 border-[#0f172a] bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#0f172a] bg-white px-2.5 py-1 text-xs font-extrabold text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#ecfeff]"
          >
            <ArrowLeft className="h-4 w-4" />
            @{settings.handle}
          </Link>
          <Link
            href="/portal"
            className="rounded-lg border-2 border-[#0f172a] bg-[#a855f7] px-3 py-1 text-xs font-extrabold text-white shadow-[2px_2px_0px_#0f172a] hover:bg-[#9333ea]"
          >
            Buyer Portal
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 pb-24">
        <div className="grid grid-cols-1 gap-6">
          {/* Product Header Card */}
          <Card className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg border-2 border-[#0f172a] px-2.5 py-1 text-xs font-extrabold uppercase shadow-[2px_2px_0px_#0f172a] ${meta.accentBg} ${meta.accentText}`}
              >
                <ProductTypeIcon type={product.type} className="h-3.5 w-3.5" />
                {meta.label}
              </span>
              {discountPct > 0 && <Badge variant="danger">Hemat {discountPct}%</Badge>}
              {product.affiliate_enabled && (
                <Badge variant="info">
                  Komisi Affiliate {product.affiliate_commission_pct}%
                </Badge>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0f172a]">
              {product.title}
            </h1>

            {product.short_description && (
              <p className="mt-2.5 text-sm sm:text-base font-medium text-[#334155] leading-relaxed">
                {product.short_description}
              </p>
            )}

            {/* Price & Primary Action Bar */}
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border-2 border-[#0f172a] bg-[#ecfeff] p-5 shadow-[4px_4px_0px_#0f172a]">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#334155]">
                  {product.type === "donation" || product.is_pay_what_you_want
                    ? "Nominal Bebas"
                    : product.type === "membership"
                    ? `Langganan (${product.metadata.billing_cycle ?? "monthly"})`
                    : "Harga"}
                </p>
                <div className="mt-0.5 flex items-baseline gap-2.5">
                  <span className="text-2xl font-extrabold text-[#0f172a]">
                    {product.type === "donation" || product.is_pay_what_you_want
                      ? `Mulai ${formatIDR(product.min_price || product.price)}`
                      : product.price === 0
                      ? "Gratis"
                      : formatIDR(product.price)}
                  </span>
                  {product.compare_at_price && product.compare_at_price > product.price && (
                    <span className="text-sm font-semibold text-[#64748b] line-through">
                      {formatIDR(product.compare_at_price)}
                    </span>
                  )}
                </div>
              </div>

              <Link
                href={`/checkout/${product.slug}`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-[#0f172a] bg-[#22d3ee] px-6 text-sm font-extrabold text-[#0f172a] shadow-[4px_4px_0px_#0f172a] transition-all hover:bg-[#06b6d4] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                <span>{meta.ctaLabel}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Description */}
            {product.description && (
              <div className="mt-6 border-t-2 border-[#0f172a] pt-6">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0f172a] mb-2.5">
                  Deskripsi Lengkap
                </h2>
                <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-[#334155]">
                  {product.description}
                </p>
              </div>
            )}
          </Card>

          {/* 1. Digital Product Delivery Info */}
          {product.type === "digital" && (
            <Card className="p-6">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0f172a] mb-3">
                Pengiriman Instan
              </h2>
              <div className="flex items-start gap-3 rounded-xl border-2 border-[#0f172a] bg-[#cffafe] p-4 text-xs font-bold text-[#0f172a] shadow-[3px_3px_0px_#0f172a]">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[#0f172a]" />
                <p>
                  {product.metadata.delivery_note ||
                    "File digital & tautan akses langsung terbuka di Buyer Portal segera setelah pembayaran Midtrans terkonfirmasi."}
                </p>
              </div>
            </Card>
          )}

          {/* 2. Online Course Curriculum */}
          {product.type === "course" && courseSections.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0f172a]">
                  Kurikulum Kelas
                </h2>
                <Badge variant="info">
                  {courseSections.length} Modul ·{" "}
                  {courseSections.reduce((acc, s) => acc + (s.lessons?.length ?? 0), 0)} Materi
                </Badge>
              </div>
              <div className="space-y-4">
                {courseSections.map((section) => (
                  <div
                    key={section.id}
                    className="rounded-xl border-2 border-[#0f172a] overflow-hidden shadow-[3px_3px_0px_#0f172a]"
                  >
                    <div className="bg-[#f3e8ff] px-4 py-3 text-xs font-extrabold text-[#0f172a] border-b-2 border-[#0f172a]">
                      {section.title}
                    </div>
                    <ul className="divide-y-2 divide-[#0f172a]/15 bg-white">
                      {(section.lessons ?? []).map((lesson) => (
                        <li
                          key={lesson.id}
                          className="flex items-center justify-between gap-3 px-4 py-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {lesson.content_type === "video" ? (
                              <PlayCircle className="h-4 w-4 shrink-0 text-[#0891b2]" />
                            ) : (
                              <FileText className="h-4 w-4 shrink-0 text-[#7e22ce]" />
                            )}
                            <span className="font-bold text-[#0f172a] truncate">
                              {lesson.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-semibold text-[#475569]">
                              {lesson.duration_minutes} mnt
                            </span>
                            {lesson.is_free_preview ? (
                              <Badge variant="success">Preview</Badge>
                            ) : (
                              <Lock className="h-3.5 w-3.5 text-[#0f172a]" />
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 3. 1-on-1 Appointment Details */}
          {product.type === "appointment" && (
            <Card className="p-6">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0f172a] mb-4">
                Detail Sesi 1-on-1
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border-2 border-[#0f172a] bg-[#ecfeff] p-3.5 shadow-[2px_2px_0px_#0f172a]">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#334155]">
                    <Clock className="h-3.5 w-3.5" /> Durasi
                  </div>
                  <p className="mt-1 text-sm font-extrabold text-[#0f172a]">
                    {product.metadata.duration_minutes ?? 60} Menit
                  </p>
                </div>
                <div className="rounded-xl border-2 border-[#0f172a] bg-[#f3e8ff] p-3.5 shadow-[2px_2px_0px_#0f172a]">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#334155]">
                    <Video className="h-3.5 w-3.5" /> Platform
                  </div>
                  <p className="mt-1 text-sm font-extrabold text-[#0f172a]">
                    {product.metadata.meeting_platform || "Google Meet / Zoom"}
                  </p>
                </div>
                <div className="rounded-xl border-2 border-[#0f172a] bg-[#ecfeff] p-3.5 shadow-[2px_2px_0px_#0f172a]">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#334155]">
                    <Calendar className="h-3.5 w-3.5" /> Hari Tersedia
                  </div>
                  <p className="mt-1 text-sm font-extrabold text-[#0f172a]">
                    {availability.length > 0
                      ? availability.map((a) => WEEKDAY_NAMES[a.day_of_week]).join(", ")
                      : "Senin - Jumat"}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* 4. Event / Webinar Details */}
          {product.type === "event" && (
            <Card className="p-6">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0f172a] mb-4">
                Informasi Acara
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border-2 border-[#0f172a] bg-[#ecfeff] p-3.5 shadow-[2px_2px_0px_#0f172a]">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#334155]">
                    <Calendar className="h-3.5 w-3.5" /> Jadwal
                  </div>
                  <p className="mt-1 text-sm font-extrabold text-[#0f172a]">
                    {product.metadata.event_date
                      ? formatDateTimeID(product.metadata.event_date)
                      : "Segera diumumkan"}
                  </p>
                </div>
                <div className="rounded-xl border-2 border-[#0f172a] bg-[#f3e8ff] p-3.5 shadow-[2px_2px_0px_#0f172a]">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#334155]">
                    <MapPin className="h-3.5 w-3.5" /> Lokasi
                  </div>
                  <p className="mt-1 text-sm font-extrabold text-[#0f172a]">
                    {product.metadata.event_location || "Online Webinar"}
                  </p>
                </div>
                <div className="rounded-xl border-2 border-[#0f172a] bg-[#ecfeff] p-3.5 shadow-[2px_2px_0px_#0f172a]">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#334155]">
                    <Users className="h-3.5 w-3.5" /> Sisa Kuota
                  </div>
                  <p className="mt-1 text-sm font-extrabold text-[#0f172a]">
                    {product.stock_quantity !== null ? `${product.stock_quantity} Kursi` : "Terbuka"}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* 5. Physical Product Variants */}
          {product.type === "physical" && variants.length > 0 && (
            <Card className="p-6">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0f172a] mb-3">
                Pilihan Varian
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {variants.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-xl border-2 border-[#0f172a] bg-[#f4f8fb] p-3.5 shadow-[2px_2px_0px_#0f172a]"
                  >
                    <div>
                      <p className="text-sm font-extrabold text-[#0f172a]">{v.name}</p>
                      <p className="text-xs font-medium text-[#475569]">
                        Stok: {v.stock_quantity} · {v.weight_grams}g
                      </p>
                    </div>
                    <span className="text-sm font-extrabold text-[#0e7490]">
                      {formatIDR(v.price_override ?? product.price)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 6. Membership Benefits */}
          {product.type === "membership" && (product.metadata.benefits?.length ?? 0) > 0 && (
            <Card className="p-6">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0f172a] mb-3">
                Benefit Eksklusif Member
              </h2>
              <ul className="space-y-2.5">
                {product.metadata.benefits?.map((b, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm font-medium text-[#0f172a]">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[#0891b2]" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* 7. Donation Wall of Supporters */}
          {product.type === "donation" && recentDonations.length > 0 && (
            <Card className="p-6">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0f172a] mb-4">
                Dukungan Terbaru
              </h2>
              <div className="space-y-3">
                {recentDonations.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-xl border-2 border-[#0f172a] bg-[#f4f8fb] p-3.5 shadow-[2px_2px_0px_#0f172a]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#0f172a]">
                        {d.is_anonymous ? "Pendukung Anonim" : d.supporter_name}
                      </span>
                      <span className="rounded-md border border-[#0f172a] bg-[#67e8f9] px-2 py-0.5 text-xs font-extrabold text-[#0f172a]">
                        {formatIDR(d.amount)}
                      </span>
                    </div>
                    {d.message && (
                      <p className="mt-1.5 text-xs font-medium text-[#334155] leading-relaxed">
                        {d.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Order Bump Preview Teaser */}
          {orderBumpProduct && (
            <Card className="p-5 bg-[#f3e8ff]">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#7e22ce]">
                Penawaran Spesial Tersedia di Checkout
              </p>
              <p className="mt-1 text-sm font-extrabold text-[#0f172a]">
                {product.order_bump_headline || `Tambahkan ${orderBumpProduct.title}`}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-[#334155]">
                Harga bundling khusus{" "}
                <span className="font-extrabold text-[#0f172a]">
                  {formatIDR(product.order_bump_price ?? orderBumpProduct.price)}
                </span>{" "}
                (normal {formatIDR(orderBumpProduct.price)}).
              </p>
            </Card>
          )}

          {/* Trust Bar */}
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#334155] pt-2">
            <ShieldCheck className="h-4 w-4 text-[#0891b2]" />
            <span>Transaksi aman otomatis via Midtrans (QRIS, Virtual Account, GoPay, OVO, DANA)</span>
          </div>
        </div>
      </main>
    </div>
  );
}
