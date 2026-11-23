import type { Product, ProductVariant, Voucher } from "@/types/database";

export interface CheckoutPriceInput {
  product: Pick<
    Product,
    "id" | "price" | "is_pay_what_you_want" | "min_price" | "order_bump_price" | "type"
  >;
  variant?: Pick<ProductVariant, "id" | "price_override"> | null;
  quantity: number;
  customAmount?: number | null;
  includeOrderBump: boolean;
  orderBumpProduct?: Pick<Product, "id" | "price"> | null;
  voucher?: Voucher | null;
  shippingCost?: number;
}

export interface CheckoutPriceResult {
  unitPrice: number;
  mainSubtotal: number;
  orderBumpAmount: number;
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  totalAmount: number;
}

export function validateVoucherEligibility(
  voucher: Voucher,
  subtotal: number,
  productId: string,
  now = new Date()
): { valid: boolean; reason?: string } {
  if (!voucher.is_active) {
    return { valid: false, reason: "Voucher tidak aktif." };
  }
  if (voucher.starts_at && new Date(voucher.starts_at) > now) {
    return { valid: false, reason: "Periode voucher belum dimulai." };
  }
  if (voucher.expires_at && new Date(voucher.expires_at) < now) {
    return { valid: false, reason: "Voucher sudah kadaluarsa." };
  }
  if (voucher.max_uses !== null && voucher.used_count >= voucher.max_uses) {
    return { valid: false, reason: "Kuota penggunaan voucher sudah habis." };
  }
  if (voucher.applicable_product_id && voucher.applicable_product_id !== productId) {
    return { valid: false, reason: "Voucher tidak berlaku untuk produk ini." };
  }
  if (subtotal < Number(voucher.min_order_amount)) {
    return {
      valid: false,
      reason: `Minimal belanja Rp${Number(voucher.min_order_amount).toLocaleString("id-ID")} untuk memakai voucher ini.`,
    };
  }
  return { valid: true };
}

export function calculateVoucherDiscount(voucher: Voucher, subtotal: number): number {
  if (subtotal <= 0) return 0;

  let discount = 0;
  if (voucher.discount_type === "percentage") {
    discount = Math.floor((subtotal * Number(voucher.discount_value)) / 100);
    if (voucher.max_discount_amount !== null) {
      discount = Math.min(discount, Number(voucher.max_discount_amount));
    }
  } else {
    discount = Number(voucher.discount_value);
  }

  return Math.max(0, Math.min(discount, subtotal));
}

export function calculateCheckoutPricing(input: CheckoutPriceInput): CheckoutPriceResult {
  const safeQty = Math.max(1, Math.floor(input.quantity || 1));

  let unitPrice = Number(input.product.price);
  if (input.variant && input.variant.price_override !== null) {
    unitPrice = Number(input.variant.price_override);
  } else if (
    (input.product.is_pay_what_you_want || input.product.type === "donation") &&
    input.customAmount !== undefined &&
    input.customAmount !== null
  ) {
    const min = Math.max(0, Number(input.product.min_price || 0));
    unitPrice = Math.max(min, Math.floor(Number(input.customAmount)));
  }

  const mainSubtotal = unitPrice * safeQty;

  const orderBumpAmount =
    input.includeOrderBump && input.orderBumpProduct
      ? Number(input.product.order_bump_price ?? input.orderBumpProduct.price)
      : 0;

  const subtotal = mainSubtotal + orderBumpAmount;

  let discountAmount = 0;
  if (input.voucher) {
    const check = validateVoucherEligibility(input.voucher, subtotal, input.product.id);
    if (check.valid) {
      discountAmount = calculateVoucherDiscount(input.voucher, subtotal);
    }
  }

  const shippingCost =
    input.product.type === "physical" ? Math.max(0, Number(input.shippingCost || 0)) : 0;

  const totalAmount = Math.max(0, subtotal - discountAmount + shippingCost);

  return {
    unitPrice,
    mainSubtotal,
    orderBumpAmount,
    subtotal,
    discountAmount,
    shippingCost,
    totalAmount,
  };
}

export function calculateAffiliateCommission(
  netProductAmount: number,
  commissionPct: number
): number {
  if (netProductAmount <= 0 || commissionPct <= 0) return 0;
  return Math.floor((netProductAmount * commissionPct) / 100);
}

function parseMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface GeneratedTimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export function generateAppointmentSlots(params: {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  bufferMinutes: number;
  bookedStartTimes: string[];
}): GeneratedTimeSlot[] {
  const startMin = parseMinutes(params.startTime);
  const endMin = parseMinutes(params.endTime);
  const duration = Math.max(15, params.durationMinutes);
  const buffer = Math.max(0, params.bufferMinutes);
  const step = duration + buffer;
  const bookedSet = new Set(params.bookedStartTimes);

  const slots: GeneratedTimeSlot[] = [];
  for (let current = startMin; current + duration <= endMin; current += step) {
    const slotStart = formatMinutes(current);
    const slotEnd = formatMinutes(current + duration);
    slots.push({
      start: slotStart,
      end: slotEnd,
      available: !bookedSet.has(slotStart),
    });
  }
  return slots;
}
