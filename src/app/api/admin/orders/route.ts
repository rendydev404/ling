import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

const updateSchema = z.object({
  orderId: z.string().uuid(),
  shipping_tracking_number: z.string().max(120).nullable().optional(),
  shipping_status: z.enum(["processing", "shipped", "delivered"]),
});

export async function PATCH(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 503 });
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { error } = await supabase
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
