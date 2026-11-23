import { describe, expect, it } from "vitest";
import {
  calculateAffiliateCommission,
  calculateCheckoutPricing,
  generateAppointmentSlots,
  validateVoucherEligibility,
} from "./checkout-engine";
import type { Voucher } from "@/types/database";

const BASE_VOUCHER: Voucher = {
  id: "v1",
  code: "HEMAT20",
  discount_type: "percentage",
  discount_value: 20,
  max_discount_amount: 50000,
  min_order_amount: 100000,
  max_uses: 10,
  used_count: 2,
  applicable_product_id: null,
  starts_at: null,
  expires_at: null,
  is_active: true,
  created_at: new Date().toISOString(),
};

describe("Checkout Pricing Engine", () => {
  it("calculates main product + order bump + capped percentage voucher", () => {
    const result = calculateCheckoutPricing({
      product: {
        id: "p1",
        type: "course",
        price: 300000,
        is_pay_what_you_want: false,
        min_price: 0,
        order_bump_price: 50000,
      },
      quantity: 1,
      includeOrderBump: true,
      orderBumpProduct: { id: "p2", price: 100000 },
      voucher: BASE_VOUCHER,
    });

    // Subtotal = 300k + 50k = 350k; 20% = 70k but capped at 50k
    expect(result.subtotal).toBe(350000);
    expect(result.orderBumpAmount).toBe(50000);
    expect(result.discountAmount).toBe(50000);
    expect(result.totalAmount).toBe(300000);
  });

  it("enforces minimum price on donation / pay-what-you-want", () => {
    const result = calculateCheckoutPricing({
      product: {
        id: "don1",
        type: "donation",
        price: 25000,
        is_pay_what_you_want: true,
        min_price: 15000,
        order_bump_price: null,
      },
      quantity: 1,
      customAmount: 5000, // below min_price
      includeOrderBump: false,
    });

    expect(result.unitPrice).toBe(15000);
    expect(result.totalAmount).toBe(15000);
  });

  it("adds shipping cost only for physical products and respects variant price", () => {
    const result = calculateCheckoutPricing({
      product: {
        id: "phys1",
        type: "physical",
        price: 150000,
        is_pay_what_you_want: false,
        min_price: 0,
        order_bump_price: null,
      },
      variant: { id: "var1", price_override: 200000 },
      quantity: 2,
      includeOrderBump: false,
      shippingCost: 20000,
    });

    expect(result.mainSubtotal).toBe(400000);
    expect(result.shippingCost).toBe(20000);
    expect(result.totalAmount).toBe(420000);
  });

  it("rejects expired or quota-exhausted vouchers", () => {
    const expired = validateVoucherEligibility(
      { ...BASE_VOUCHER, expires_at: "2020-01-01T00:00:00Z" },
      200000,
      "p1",
      new Date("2026-11-23T00:00:00Z")
    );
    expect(expired.valid).toBe(false);

    const exhausted = validateVoucherEligibility(
      { ...BASE_VOUCHER, max_uses: 5, used_count: 5 },
      200000,
      "p1"
    );
    expect(exhausted.valid).toBe(false);
  });

  it("computes affiliate commission accurately", () => {
    expect(calculateAffiliateCommission(250000, 25)).toBe(62500);
    expect(calculateAffiliateCommission(0, 25)).toBe(0);
  });

  it("generates appointment slots and marks booked slots unavailable", () => {
    const slots = generateAppointmentSlots({
      startTime: "09:00",
      endTime: "12:00",
      durationMinutes: 60,
      bufferMinutes: 15,
      bookedStartTimes: ["10:15"],
    });

    expect(slots).toEqual([
      { start: "09:00", end: "10:00", available: true },
      { start: "10:15", end: "11:15", available: false },
    ]);
  });
});
