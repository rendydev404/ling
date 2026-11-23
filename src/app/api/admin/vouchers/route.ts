import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

const voucherSchema = z.object({
  code: z.string().min(2).max(40),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.number().positive(),
  max_discount_amount: z.number().min(0).nullable().optional(),
  min_order_amount: z.number().min(0).default(0),
  max_uses: z.number().int().positive().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
});

async function assertAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { supabase };
}

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 503 });
  }
  const auth = await assertAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const parsed = voucherSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { data: voucher, error } = await auth.supabase
    .from("vouchers")
    .insert({ ...parsed.data, code: parsed.data.code.trim().toUpperCase() })
    .select(
      "id, code, discount_type, discount_value, max_discount_amount, min_order_amount, max_uses, used_count, applicable_product_id, starts_at, expires_at, is_active, created_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ voucher }, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 503 });
  }
  const auth = await assertAdmin();
  if ("error" in auth) return auth.error;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await auth.supabase.from("vouchers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
