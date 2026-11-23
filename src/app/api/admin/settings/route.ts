import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

const settingsSchema = z.object({
  brand_name: z.string().min(1).max(120),
  handle: z.string().min(1).max(60),
  tagline: z.string().max(200).optional().default(""),
  bio: z.string().max(600).optional().default(""),
  avatar_url: z.string().nullable().optional(),
  verified_badge: z.boolean().optional(),
  theme_config: z.record(z.unknown()).optional(),
  social_links: z.array(z.record(z.unknown())).optional(),
  seo_config: z.record(z.unknown()).optional(),
  pixels_config: z.record(z.unknown()).optional(),
  shipping_options: z.array(z.record(z.unknown())).optional(),
  default_affiliate_commission_pct: z.number().min(0).max(90).optional(),
  affiliate_auto_approve: z.boolean().optional(),
});

export async function PUT(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: true, simulated: true });
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
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { error } = await supabase
    .from("store_settings")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("singleton_key", "primary");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
