import { NextResponse } from "next/server";
import { z } from "zod";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { assertAdminApi } from "@/lib/supabase/auth";

const updateSchema = z.object({
  orderId: z.string().uuid(),
  shipping_tracking_number: z.string().max(120).nullable().optional(),
  shipping_status: z.enum(["processing", "shipped", "delivered"]),
});

export async function PATCH(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 503 });
  }
  const auth = await assertAdminApi();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { error } = await auth.supabase
    .from("orders")
    .update({
      shipping_tracking_number: parsed.data.shipping_tracking_number ?? null,
      shipping_status: parsed.data.shipping_status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.orderId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
