import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

const blockItemSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["link", "product", "heading", "text", "image", "video", "divider"]),
  title: z.string().nullable().optional(),
  subtitle: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  product_id: z.string().nullable().optional(),
  badge_text: z.string().nullable().optional(),
  layout_style: z.enum(["compact", "featured"]).default("compact"),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0),
  metadata: z.record(z.unknown()).optional().default({}),
});

const payloadSchema = z.object({
  blocks: z.array(blockItemSchema).max(100),
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
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Replace bio blocks cleanly
  const { error: delError } = await supabase
    .from("bio_blocks")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  if (parsed.data.blocks.length > 0) {
    const rows = parsed.data.blocks.map((b, idx) => ({
      type: b.type,
      title: b.title ?? null,
      subtitle: b.subtitle ?? null,
      url: b.url ?? null,
      image_url: b.image_url ?? null,
      product_id: b.product_id ?? null,
      badge_text: b.badge_text ?? null,
      layout_style: b.layout_style,
      is_active: b.is_active,
      sort_order: idx + 1,
      metadata: b.metadata ?? {},
    }));

    const { error: insError } = await supabase.from("bio_blocks").insert(rows);
    if (insError) {
      return NextResponse.json({ error: insError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
