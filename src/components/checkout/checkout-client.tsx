"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Sparkles,
  Tag,
} from "lucide-react";
import type {
  AppointmentAvailability,
  Product,
  ProductVariant,
  StoreSettings,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  CustomDatePicker,
  CustomTimeSlotPicker,
  type TimeSlotOption,
} from "@/components/ui/custom-date-picker";
import { Card, CustomSwitch } from "@/components/ui/controls";
import { useToast } from "@/components/ui/custom-toast";
import { formatIDR } from "@/lib/utils";
import { PRODUCT_TYPE_META, ProductTypeIcon } from "@/components/storefront/product-type-meta";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options: {
          onSuccess?: () => void;
          onPending?: () => void;
          onError?: () => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

export function CheckoutClient({
  product,
  variants,
  availability,
  orderBumpProduct,
  settings,
  snapScriptUrl,
  midtransClientKey,
}: {
  product: Product;
  variants: ProductVariant[];
  availability: AppointmentAvailability[];
  orderBumpProduct: Product | null;
  settings: StoreSettings;
  snapScriptUrl: string;
  midtransClientKey: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const meta = PRODUCT_TYPE_META[product.type];

  // Customer info
  const [buyerName, setBuyerName] = React.useState("");
  const [buyerEmail, setBuyerEmail] = React.useState("");
  const [buyerPhone, setBuyerPhone] = React.useState("");
  const [buyerNote, setBuyerNote] = React.useState("");

  // Variant / Quantity / Custom Amount (Donation / PWYW)
  const [variantId, setVariantId] = React.useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = React.useState(1);
  const [customAmount, setCustomAmount] = React.useState(
    String(product.price || product.min_price || 25000)
  );
  const [donationAnonymous, setDonationAnonymous] = React.useState(false);

  // Appointment Date & Time Slot
  const todayIso = new Date().toISOString().slice(0, 10);
  const [bookingDate, setBookingDate] = React.useState("");
  const [slots, setSlots] = React.useState<TimeSlotOption[]>([]);
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const [selectedSlot, setSelectedSlot] = React.useState<{ start: string; end: string } | null>(
    null
  );

  // Physical Shipping
  const [courierCode, setCourierCode] = React.useState(
    settings.shipping_options[0]?.code ?? ""
  );
  const [province, setProvince] = React.useState("");
  const [city, setCity] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [postalCode, setPostalCode] = React.useState("");

  // Order Bump & Voucher
  const [includeOrderBump, setIncludeOrderBump] = React.useState(false);
  const [voucherInput, setVoucherInput] = React.useState("");
  const [appliedVoucher, setAppliedVoucher] = React.useState<{
    code: string;
    discountAmount: number;
  } | null>(null);
  const [validatingVoucher, setValidatingVoucher] = React.useState(false);

  const [submitting, setSubmitting] = React.useState(false);

  // Fetch appointment slots whenever date changes
  React.useEffect(() => {
    if (product.type !== "appointment" || !bookingDate) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    fetch(`/api/appointments/${product.id}/slots?date=${encodeURIComponent(bookingDate)}`)
      .then((res) => res.json())
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [bookingDate, product.id, product.type]);

  const selectedVariant = variants.find((v) => v.id === variantId) ?? null;
  const selectedCourier = settings.shipping_options.find((c) => c.code === courierCode) ?? null;

  const baseUnitPrice =
    product.type === "donation" || product.is_pay_what_you_want
      ? Math.max(product.min_price || 0, Number(customAmount) || 0)
      : selectedVariant?.price_override ?? product.price;

  const mainSubtotal = baseUnitPrice * quantity;
  const bumpPrice =
    includeOrderBump && orderBumpProduct
      ? Number(product.order_bump_price ?? orderBumpProduct.price)
      : 0;
  const subtotal = mainSubtotal + bumpPrice;
  const discountAmount = appliedVoucher?.discountAmount ?? 0;
  const shippingCost = product.type === "physical" ? selectedCourier?.cost ?? 0 : 0;
  const grandTotal = Math.max(0, subtotal - discountAmount + shippingCost);

  async function handleApplyVoucher() {
    if (!voucherInput.trim()) return;
    setValidatingVoucher(true);
    try {
      const res = await fetch("/api/vouchers/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: voucherInput.trim(),
          subtotal,
          productId: product.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAppliedVoucher(null);
        toast({ type: "error", title: "Voucher tidak berlaku", description: json.error });
        return;
      }
      setAppliedVoucher({ code: json.code, discountAmount: json.discountAmount });
      toast({
        type: "success",
        title: `Voucher ${json.code} diterapkan`,
        description: `Hemat ${formatIDR(json.discountAmount)}`,
      });
    } finally {
      setValidatingVoucher(false);
    }
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();

    if (product.type === "appointment" && (!bookingDate || !selectedSlot)) {
      toast({ type: "error", title: "Pilih tanggal dan jam sesi konsultasi terlebih dahulu" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSlug: product.slug,
          buyerName,
          buyerEmail,
          buyerPhone,
          quantity,
          variantId: variantId || null,
          customAmount:
            product.type === "donation" || product.is_pay_what_you_want
              ? Number(customAmount)
              : null,
          includeOrderBump,
          voucherCode: appliedVoucher?.code ?? null,
          shippingCourierCode: product.type === "physical" ? courierCode : null,
          shippingAddress:
            product.type === "physical"
              ? {
                  recipient: buyerName,
                  province,
                  city,
                  address,
                  postalCode,
                }
              : null,
          bookingDate: product.type === "appointment" ? bookingDate : null,
          bookingStartTime: selectedSlot?.start ?? null,
          bookingEndTime: selectedSlot?.end ?? null,
          donationAnonymous,
          buyerNote: buyerNote || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast({ type: "error", title: "Checkout gagal", description: json.error });
        return;
      }

      // If real Midtrans Snap popup is loaded & not simulated, trigger Snap popup
      if (!json.isSimulated && json.snapToken && window.snap) {
        window.snap.pay(json.snapToken, {
          onSuccess: () => router.push(`/orders/${json.orderNumber}`),
          onPending: () => router.push(`/orders/${json.orderNumber}`),
          onError: () =>
            toast({ type: "error", title: "Pembayaran gagal diproses oleh Midtrans" }),
          onClose: () => router.push(`/orders/${json.orderNumber}`),
        });
        return;
      }

      // Otherwise navigate to order confirmation / payment redirect URL
      router.push(json.redirectUrl || `/orders/${json.orderNumber}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
      {midtransClientKey && !midtransClientKey.includes("xxxxxxxx") && (
        <Script
          src={snapScriptUrl}
          data-client-key={midtransClientKey}
          strategy="afterInteractive"
        />
      )}

      <header className="sticky top-0 z-20 border-b border-[#e2e8f0] bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link
            href={`/p/${product.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#475569] hover:text-[#0f172a]"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Detail Produk
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#059669]">
            <Lock className="h-3.5 w-3.5" />
            Checkout Aman Midtrans
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 pb-20">
        <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form */}
          <div className="lg:col-span-7 space-y-5">
            {/* Customer Details */}
            <Card className="p-6 space-y-4">
              <h2 className="text-base font-extrabold text-[#0f172a]">1. Informasi Pembeli</h2>
              <Input
                label="Nama Lengkap"
                required
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Nama lengkap Anda"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Alamat Email (Pengiriman Akses)"
                  type="email"
                  required
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="nama@email.com"
                />
                <Input
                  label="Nomor WhatsApp"
                  required
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="081234567890"
                />
              </div>
            </Card>

            {/* Donation / PWYW Amount Picker */}
            {(product.type === "donation" || product.is_pay_what_you_want) && (
              <Card className="p-6 space-y-4">
                <h2 className="text-base font-extrabold text-[#0f172a]">
                  2. Pilih Nominal Dukungan
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(product.metadata.preset_amounts ?? [15000, 25000, 50000, 100000]).map(
                    (amt) => {
                      const active = Number(customAmount) === amt;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCustomAmount(String(amt))}
                          className={`h-10 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                            active
                              ? "border-[#059669] bg-[#059669] text-white"
                              : "border-[#cbd5e1] bg-white text-[#0f172a] hover:border-[#059669]"
                          }`}
                        >
                          {formatIDR(amt)}
                        </button>
                      );
                    }
                  )}
                </div>
                <Input
                  label={`Nominal Lainnya (Minimal ${formatIDR(product.min_price || 10000)})`}
                  type="number"
                  min={product.min_price || 10000}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                />
                <Textarea
                  label="Pesan Dukungan (Opsional)"
                  value={buyerNote}
                  onChange={(e) => setBuyerNote(e.target.value)}
                  placeholder="Tulis pesan semangat untuk kreator..."
                />
                {product.type === "donation" && (
                  <CustomSwitch
                    checked={donationAnonymous}
                    onChange={setDonationAnonymous}
                    label="Sembunyikan nama saya (Kirim sebagai Anonim)"
                  />
                )}
              </Card>
            )}

            {/* Appointment Date & Slot Picker */}
            {product.type === "appointment" && (
              <Card className="p-6 space-y-4">
                <h2 className="text-base font-extrabold text-[#0f172a]">
                  2. Pilih Jadwal Sesi 1-on-1
                </h2>
                <CustomDatePicker
                  inline
                  label="Pilih Tanggal"
                  value={bookingDate}
                  minDate={todayIso}
                  allowedWeekdays={availability.map((a) => a.day_of_week)}
                  onChange={setBookingDate}
                />
                {bookingDate && (
                  <div className="space-y-2 pt-2">
                    <span className="block text-xs font-semibold text-[#334155]">
                      Pilih Jam Tersedia (WIB)
                    </span>
                    <CustomTimeSlotPicker
                      slots={slots}
                      loading={loadingSlots}
                      value={selectedSlot?.start ?? ""}
                      onChange={(start, end) => setSelectedSlot({ start, end })}
                    />
                  </div>
                )}
                <Textarea
                  label="Topik / Pertanyaan yang Ingin Dibahas"
                  value={buyerNote}
                  onChange={(e) => setBuyerNote(e.target.value)}
                  placeholder="Ceritakan singkat konteks bisnis atau kendala Anda..."
                />
              </Card>
            )}

            {/* Physical Variant & Shipping Address */}
            {product.type === "physical" && (
              <Card className="p-6 space-y-4">
                <h2 className="text-base font-extrabold text-[#0f172a]">
                  2. Varian & Alamat Pengiriman
                </h2>
                {variants.length > 0 && (
                  <CustomSelect
                    label="Pilih Varian Produk"
                    value={variantId}
                    onChange={setVariantId}
                    options={variants.map((v) => ({
                      value: v.id,
                      label: `${v.name} — ${formatIDR(v.price_override ?? product.price)}`,
                      description: `Stok tersedia: ${v.stock_quantity}`,
                    }))}
                  />
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Jumlah (Qty)"
                    type="number"
                    min={1}
                    max={20}
                    value={String(quantity)}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                  />
                  <CustomSelect
                    label="Pilih Kurir Pengiriman"
                    value={courierCode}
                    onChange={setCourierCode}
                    options={settings.shipping_options.map((c) => ({
                      value: c.code,
                      label: `${c.name} (${formatIDR(c.cost)})`,
                      description: `Estimasi ${c.estimatedDays}`,
                    }))}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Provinsi"
                    required
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="DKI Jakarta"
                  />
                  <Input
                    label="Kota / Kabupaten"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Jakarta Selatan"
                  />
                </div>
                <Textarea
                  label="Alamat Lengkap (Jalan, RT/RW, Patokan)"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Kemang Raya No. 12..."
                />
                <Input
                  label="Kode Pos"
                  required
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="12730"
                />
              </Card>
            )}

            {/* Order Bump Card */}
            {orderBumpProduct && (
              <div
                onClick={() => setIncludeOrderBump((prev) => !prev)}
                className={`rounded-2xl border-2 p-5 transition-colors cursor-pointer ${
                  includeOrderBump
                    ? "border-[#059669] bg-[#ecfdf5]"
                    : "border-dashed border-[#059669] bg-white hover:bg-[#f8fafc]"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                      includeOrderBump
                        ? "border-[#059669] bg-[#059669] text-white"
                        : "border-[#94a3b8] bg-white"
                    }`}
                  >
                    {includeOrderBump && <Check className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#047857]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Penawaran Tambahan Sekali Klik (Order Bump)
                    </div>
                    <p className="mt-1 text-sm font-bold text-[#0f172a]">
                      {product.order_bump_headline || `Tambahkan ${orderBumpProduct.title}`}
                    </p>
                    <p className="mt-0.5 text-xs text-[#475569]">
                      Cukup tambah{" "}
                      <span className="font-extrabold text-[#059669]">
                        {formatIDR(product.order_bump_price ?? orderBumpProduct.price)}
                      </span>{" "}
                      <span className="line-through text-[#94a3b8]">
                        {formatIDR(orderBumpProduct.price)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Order Summary */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
            <Card className="p-6 space-y-5">
              <h2 className="text-base font-extrabold text-[#0f172a]">Ringkasan Pesanan</h2>

              <div className="flex items-start gap-3 pb-4 border-b border-[#e2e8f0]">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.accentBg} ${meta.accentText}`}
                >
                  <ProductTypeIcon type={product.type} className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#0f172a] leading-snug">{product.title}</p>
                  <p className="text-xs text-[#64748b] mt-0.5">
                    {selectedVariant ? selectedVariant.name : meta.label} · Qty {quantity}
                  </p>
                </div>
                <span className="text-sm font-bold text-[#0f172a]">
                  {formatIDR(mainSubtotal)}
                </span>
              </div>

              {/* Voucher Input */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#334155]">
                  Punya Kode Voucher?
                </label>
                <div className="flex gap-2">
                  <Input
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                    placeholder="Contoh: LING20"
                    leftIcon={<Tag className="h-3.5 w-3.5" />}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleApplyVoucher}
                    isLoading={validatingVoucher}
                  >
                    Pakai
                  </Button>
                </div>
                {appliedVoucher && (
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#059669]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Kode {appliedVoucher.code} aktif (-{formatIDR(appliedVoucher.discountAmount)})
                  </p>
                )}
              </div>

              {/* Breakdown */}
              <div className="space-y-2 border-t border-[#e2e8f0] pt-4 text-xs">
                <div className="flex justify-between text-[#475569]">
                  <span>Subtotal Produk</span>
                  <span className="font-semibold text-[#0f172a]">{formatIDR(mainSubtotal)}</span>
                </div>
                {bumpPrice > 0 && (
                  <div className="flex justify-between text-[#475569]">
                    <span>Order Bump</span>
                    <span className="font-semibold text-[#0f172a]">{formatIDR(bumpPrice)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#059669]">
                    <span>Diskon Voucher</span>
                    <span className="font-bold">-{formatIDR(discountAmount)}</span>
                  </div>
                )}
                {shippingCost > 0 && (
                  <div className="flex justify-between text-[#475569]">
                    <span>Ongkir ({selectedCourier?.name})</span>
                    <span className="font-semibold text-[#0f172a]">{formatIDR(shippingCost)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-[#e2e8f0] pt-3 text-base font-extrabold text-[#0f172a]">
                  <span>Total Bayar</span>
                  <span className="text-[#059669]">{formatIDR(grandTotal)}</span>
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full" isLoading={submitting}>
                Bayar Sekarang — {formatIDR(grandTotal)}
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#64748b]">
                <ShieldCheck className="h-4 w-4 text-[#059669]" />
                <span>QRIS · Virtual Account · GoPay · ShopeePay · Kartu Kredit</span>
              </div>
            </Card>
          </div>
        </form>
      </main>
    </div>
  );
}
