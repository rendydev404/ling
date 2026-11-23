import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  calculateVoucherDiscount,
  validateVoucherEligibility,
} from "@/lib/checkout-engine";
import type { Voucher } from "@/types/database";

const schema = z.object({
  code: z.string().min(1).max(40),
  subtotal: z.number().min(0),
  productId: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input kupon tidak valid" }, { status: 400 });
  }

  const normalizedCode = parsed.data.code.trim().toUpperCase();
  const supabase = createServiceRoleClient();

  // Demo mode built-in promo codes
  if (!supabase) {
    const demoVouchers: Record<string, Voucher> = {
      LING20: {
        id: "vch-demo-1",
        code: "LING20",
        discount_type: "percentage",
        discount_value: 20,
        max_discount_amount: 100000,
        min_order_amount: 50000,
        max_uses: 200,
        used_count: 14,
        applicable_product_id: null,
        starts_at: null,
        expires_at: null,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      POTONG25K: {
        id: "vch-demo-2",
        code: "POTONG25K",
        discount_type: "fixed",
        discount_value: 25000,
        max_discount_amount: null,
        min_order_amount: 100000,
        max_uses: 50,
        used_count: 8,
        applicable_product_id: null,
        starts_at: null,
        expires_at: null,
        is_active: true,
        created_at: new Date().toISOString(),
      },
    };
    const v = demoVouchers[normalizedCode];
    if (!v) {
      return NextResponse.json(
        { error: "Kode voucher tidak ditemukan. Coba LING20 atau POTONG25K di mode pratinjau." },
        { status: 404 }
      );
    }
    const check = validateVoucherEligibility(v, parsed.data.subtotal, parsed.data.productId);
    if (!check.valid) {
      return NextResponse.json({ error: check.reason }, { status: 400 });
    }
    return NextResponse.json({
      valid: true,
      code: v.code,
      discountAmount: calculateVoucherDiscount(v, parsed.data.subtotal),
    });
  }

  const { data: voucher } = await supabase
    .from("vouchers")
    .select(
      "id, code, discount_type, discount_value, max_discount_amount, min_order_amount, max_uses, used_count, applicable_product_id, starts_at, expires_at, is_active, created_at"
    )
    .ilike("code", normalizedCode)
    .single();

  if (!voucher) {
    return NextResponse.json({ error: "Kode voucher tidak ditemukan." }, { status: 404 });
  }

  const typed = voucher as Voucher;
  const check = validateVoucherEligibility(typed, parsed.data.subtotal, parsed.data.productId);
  if (!check.valid) {
    return NextResponse.json({ error: check.reason }, { status: 400 });
  }

  return NextResponse.json({
    valid: true,
    code: typed.code,
    discountAmount: calculateVoucherDiscount(typed, parsed.data.subtotal),
  });
}
