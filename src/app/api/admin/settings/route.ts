import { NextResponse } from "next/server";
import { z } from "zod";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { assertAdminApi } from "@/lib/supabase/auth";

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

const patchSchema = z.object({
  affiliate_program_enabled: z.boolean().optional(),
  affiliate_auto_approve: z.boolean().optional(),
  default_affiliate_commission_pct: z.number().min(0).max(90).optional(),
});

export async function PUT(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: true, simulated: true });
  }

  const auth = await assertAdminApi();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { error } = await auth.supabase
    .from("store_settings")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("singleton_key", "primary");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: true, simulated: true });
  }

  const auth = await assertAdminApi();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: current, error: fetchErr } = await auth.supabase
    .from("store_settings")
    .select("seo_config")
    .eq("singleton_key", "primary")
    .single();

  if (fetchErr && fetchErr.code !== "PGRST116") {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof parsed.data.affiliate_program_enabled === "boolean") {
    const existingSeo =
      current?.seo_config && typeof current.seo_config === "object"
        ? (current.seo_config as Record<string, unknown>)
        : {};
    updatePayload.seo_config = {
      ...existingSeo,
      affiliateProgramEnabled: parsed.data.affiliate_program_enabled,
    };
  }

  if (typeof parsed.data.affiliate_auto_approve === "boolean") {
    updatePayload.affiliate_auto_approve = parsed.data.affiliate_auto_approve;
  }

  if (typeof parsed.data.default_affiliate_commission_pct === "number") {
    updatePayload.default_affiliate_commission_pct =
      parsed.data.default_affiliate_commission_pct;
  }

  const { error } = await auth.supabase
    .from("store_settings")
    .update(updatePayload)
    .eq("singleton_key", "primary");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...parsed.data });
}
