"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { PaymentMethodPicker } from "@/components/checkout/payment-method-picker";
import type { PaymentMethodCode } from "@/lib/payment-methods";

export function CheckoutClient({
  product,
  variants,
  availability,
  orderBumpProduct,
  settings,
  enabledPaymentMethods,
}: {
  product: Product;
  variants: ProductVariant[];
  availability: AppointmentAvailability[];
  orderBumpProduct: Product | null;
  settings: StoreSettings;
  enabledPaymentMethods: PaymentMethodCode[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const meta = PRODUCT_TYPE_META[product.type];

  const [buyerName, setBuyerName] = React.useState("");
  const [buyerEmail, setBuyerEmail] = React.useState("");
  const [buyerPhone, setBuyerPhone] = React.useState("");
  const [buyerNote, setBuyerNote] = React.useState("");

  const [variantId, setVariantId] = React.useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = React.useState(1);
  const [customAmount, setCustomAmount] = React.useState(
    String(product.price || product.min_price || 25000)
  );
  const [donationAnonymous, setDonationAnonymous] = React.useState(false);

  const todayIso = new Date().toISOString().slice(0, 10);
  const [bookingDate, setBookingDate] = React.useState("");
  const [slots, setSlots] = React.useState<TimeSlotOption[]>([]);
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const [selectedSlot, setSelectedSlot] = React.useState<{ start: string; end: string } | null>(
    null
  );

  const [courierCode, setCourierCode] = React.useState(
    settings.shipping_options[0]?.code ?? ""
  );
  const [province, setProvince] = React.useState("");
  const [city, setCity] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [postalCode, setPostalCode] = React.useState("");

  const [includeOrderBump, setIncludeOrderBump] = React.useState(false);
  const [voucherInput, setVoucherInput] = React.useState("");
  const [appliedVoucher, setAppliedVoucher] = React.useState<{
    code: string;
    discountAmount: number;
  } | null>(null);
  const [validatingVoucher, setValidatingVoucher] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [availableMethods, setAvailableMethods] = React.useState(enabledPaymentMethods);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethodCode | null>(
    enabledPaymentMethods[0] ?? null
  );

  function handleBookingDateChange(nextDate: string) {
    setBookingDate(nextDate);
    setSelectedSlot(null);
    if (product.type !== "appointment" || !nextDate) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    fetch(`/api/appointments/${product.id}/slots?date=${encodeURIComponent(nextDate)}`)
      .then((res) => res.json())
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }

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

    if (grandTotal > 0 && !paymentMethod) {
      toast({ type: "error", title: "Pilih metode pembayaran terlebih dahulu" });
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
          paymentMethod: grandTotal > 0 ? paymentMethod : null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        if (json.unavailableMethod) {
          // Midtrans refused this channel: drop it and preselect the next one
          const remaining = availableMethods.filter((m) => m !== json.unavailableMethod);
          setAvailableMethods(remaining);
          setPaymentMethod(remaining[0] ?? null);
        }
        toast({ type: "error", title: "Checkout gagal", description: json.error });
        setSubmitting(false);
        return;
      }

      // Always land on our own payment page (same origin); the button stays loading meanwhile
      router.push(`/orders/${encodeURIComponent(json.orderNumber)}`);
    } catch {
      toast({ type: "error", title: "Koneksi terputus", description: "Silakan coba lagi." });
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen text-[#0f172a]">

      <header className="sticky top-0 z-20 border-b-2 border-[#0f172a] bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link
            href={`/p/${product.slug}`}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#0f172a] bg-white px-2.5 py-1 text-xs font-extrabold text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#ecfeff]"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#0f172a] bg-[#67e8f9] px-2.5 py-1 text-xs font-extrabold text-[#0f172a] shadow-[2px_2px_0px_#0f172a]">
            <Lock className="h-3.5 w-3.5" />
            Checkout Aman Midtrans
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 pb-20">
        <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form */}
          <div className="lg:col-span-7 space-y-5">
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
                          className={`h-10 rounded-xl border-2 border-[#0f172a] text-xs font-extrabold transition-all cursor-pointer ${
                            active
                              ? "bg-[#22d3ee] text-[#0f172a] shadow-[3px_3px_0px_#0f172a]"
                              : "bg-white text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#f3e8ff]"
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
                  onChange={handleBookingDateChange}
                />
                {bookingDate && (
                  <div className="space-y-2 pt-2">
                    <span className="block text-xs font-extrabold uppercase tracking-wider text-[#0f172a]">
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
                  placeholder="Alamat pengiriman lengkap..."
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

            {/* Order Bump Card in Purple & Cyan Neobrutalism */}
            {orderBumpProduct && (
              <div
                onClick={() => setIncludeOrderBump((prev) => !prev)}
                className={`rounded-2xl border-2 border-[#0f172a] p-5 shadow-[4px_4px_0px_#0f172a] transition-all cursor-pointer ${
                  includeOrderBump
                    ? "bg-[#f3e8ff]"
                    : "border-dashed bg-white hover:bg-[#ecfeff]"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-[#0f172a] shadow-[2px_2px_0px_#0f172a] ${
                      includeOrderBump
                        ? "bg-[#a855f7] text-white"
                        : "bg-white"
                    }`}
                  >
                    {includeOrderBump && <Check className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#7e22ce]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Penawaran Tambahan Sekali Klik (Order Bump)
                    </div>
                    <p className="mt-1 text-sm font-extrabold text-[#0f172a]">
                      {product.order_bump_headline || `Tambahkan ${orderBumpProduct.title}`}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-[#334155]">
                      Cukup tambah{" "}
                      <span className="font-extrabold text-[#0e7490]">
                        {formatIDR(product.order_bump_price ?? orderBumpProduct.price)}
                      </span>{" "}
                      <span className="line-through text-[#64748b]">
                        {formatIDR(orderBumpProduct.price)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {grandTotal > 0 && (
              <Card className="p-6 space-y-4">
                <h2 className="text-base font-extrabold text-[#0f172a]">
                  {product.type === "donation" ||
                  product.is_pay_what_you_want ||
                  product.type === "appointment" ||
                  product.type === "physical"
                    ? "3"
                    : "2"}
                  . Metode Pembayaran
                </h2>
                <PaymentMethodPicker
                  methods={availableMethods}
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                />
              </Card>
            )}
          </div>

          {/* Right Order Summary */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
            <Card className="p-6 space-y-5">
              <h2 className="text-base font-extrabold text-[#0f172a]">Ringkasan Pesanan</h2>

              <div className="flex items-start gap-3 pb-4 border-b-2 border-[#0f172a]">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#0f172a] shadow-[2px_2px_0px_#0f172a] ${meta.accentBg} ${meta.accentText}`}
                >
                  <ProductTypeIcon type={product.type} className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-[#0f172a] leading-snug">
                    {product.title}
                  </p>
                  <p className="text-xs font-medium text-[#475569] mt-0.5">
                    {selectedVariant ? selectedVariant.name : meta.label} · Qty {quantity}
                  </p>
                </div>
                <span className="text-sm font-extrabold text-[#0f172a]">
                  {formatIDR(mainSubtotal)}
                </span>
              </div>

              {/* Voucher Input */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0f172a]">
                  Punya Kode Voucher?
                </label>
                <div className="flex gap-2">
                  <Input
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                    placeholder="Masukkan kode kupon"
                    leftIcon={<Tag className="h-3.5 w-3.5" />}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleApplyVoucher}
                    isLoading={validatingVoucher}
                  >
                    Pakai
                  </Button>
                </div>
                {appliedVoucher && (
                  <p className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#0f172a] bg-[#cffafe] px-2.5 py-1 text-xs font-extrabold text-[#0f172a]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Kode {appliedVoucher.code} aktif (-{formatIDR(appliedVoucher.discountAmount)})
                  </p>
                )}
              </div>

              {/* Breakdown */}
              <div className="space-y-2 border-t-2 border-[#0f172a] pt-4 text-xs font-semibold">
                <div className="flex justify-between text-[#334155]">
                  <span>Subtotal Produk</span>
                  <span className="font-extrabold text-[#0f172a]">{formatIDR(mainSubtotal)}</span>
                </div>
                {bumpPrice > 0 && (
                  <div className="flex justify-between text-[#334155]">
                    <span>Order Bump</span>
                    <span className="font-extrabold text-[#7e22ce]">{formatIDR(bumpPrice)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#0e7490]">
                    <span>Diskon Voucher</span>
                    <span className="font-extrabold">-{formatIDR(discountAmount)}</span>
                  </div>
                )}
                {shippingCost > 0 && (
                  <div className="flex justify-between text-[#334155]">
                    <span>Ongkir ({selectedCourier?.name})</span>
                    <span className="font-extrabold text-[#0f172a]">{formatIDR(shippingCost)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t-2 border-[#0f172a] pt-3 text-base font-extrabold text-[#0f172a]">
                  <span>Total Bayar</span>
                  <span className="rounded-lg border-2 border-[#0f172a] bg-[#67e8f9] px-2.5 py-0.5 shadow-[2px_2px_0px_#0f172a]">
                    {formatIDR(grandTotal)}
                  </span>
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full" isLoading={submitting}>
                Bayar Sekarang — {formatIDR(grandTotal)}
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#334155]">
                <ShieldCheck className="h-4 w-4 text-[#0891b2]" />
                <span>Pembayaran diproses aman oleh Midtrans</span>
              </div>
            </Card>
          </div>
        </form>
      </main>
    </div>
  );
}
