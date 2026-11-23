import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

const productSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum(["digital", "course", "appointment", "event", "physical", "donation", "membership"]),
  title: z.string().min(2).max(180),
  slug: z.string().min(2).max(180),
  short_description: z.string().max(400).nullable().optional(),
  description: z.string().max(8000).nullable().optional(),
  price: z.number().min(0),
  compare_at_price: z.number().min(0).nullable().optional(),
  is_pay_what_you_want: z.boolean().default(false),
  min_price: z.number().min(0).default(0),
  status: z.enum(["draft", "published", "archived"]).default("published"),
  is_featured: z.boolean().default(false),
  stock_quantity: z.number().int().min(0).nullable().optional(),
  order_bump_product_id: z.string().uuid().nullable().optional(),
  order_bump_price: z.number().min(0).nullable().optional(),
  order_bump_headline: z.string().max(200).nullable().optional(),
  affiliate_enabled: z.boolean().default(true),
  affiliate_commission_pct: z.number().min(0).max(90).default(20),
  metadata: z.record(z.unknown()).default({}),
  digital_external_url: z.string().url().optional(),
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

const SELECT_COLS =
  "id, slug, type, title, short_description, description, thumbnail_url, gallery_urls, price, compare_at_price, is_pay_what_you_want, min_price, status, is_featured, stock_quantity, order_bump_product_id, order_bump_price, order_bump_headline, affiliate_enabled, affiliate_commission_pct, metadata, created_at, updated_at";

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 503 });
  }
  const auth = await assertAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { digital_external_url, ...productFields } = parsed.data;
  const { data: product, error } = await auth.supabase
    .from("products")
    .insert({
      ...productFields,
      slug: slugify(productFields.slug),
    })
    .select(SELECT_COLS)
    .single();

  if (error || !product) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }

  if (product.type === "digital" && digital_external_url) {
    await auth.supabase.from("product_digital_assets").insert({
      product_id: product.id,
      asset_type: "external_url",
      title: `Akses ${product.title}`,
      external_url: digital_external_url,
      sort_order: 1,
    });
  }

  if (product.type === "appointment") {
    await auth.supabase.from("appointment_availability").insert(
      [1, 2, 3, 4, 5].map((day) => ({
        product_id: product.id,
        day_of_week: day,
        start_time: "09:00",
        end_time: "17:00",
        is_active: true,
      }))
    );
  }

  return NextResponse.json({ product }, { status: 201 });
}

export async function PUT(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 503 });
  }
  const auth = await assertAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success || !parsed.data.id) {
    return NextResponse.json({ error: "Payload produk tidak valid" }, { status: 400 });
  }

  const { id, digital_external_url, ...productFields } = parsed.data;
  const { data: product, error } = await auth.supabase
    .from("products")
    .update({
      ...productFields,
      slug: slugify(productFields.slug),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(SELECT_COLS)
    .single();

  if (error || !product) {
    return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 500 });
  }

  if (product.type === "digital" && digital_external_url) {
    await auth.supabase.from("product_digital_assets").insert({
      product_id: product.id,
      asset_type: "external_url",
      title: `Link Akses ${product.title}`,
      external_url: digital_external_url,
      sort_order: 1,
    });
  }

  return NextResponse.json({ product });
}

export async function DELETE(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 503 });
  }
  const auth = await assertAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing product id" }, { status: 400 });
  }

  const { error } = await auth.supabase.from("products").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
