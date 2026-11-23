import { NextResponse } from "next/server";
import { z } from "zod";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { assertAdminApi } from "@/lib/supabase/auth";

const schema = z.object({
  name: z.string().min(2).max(120),
  target_url: z.string().url(),
  secret_key: z.string().min(4).max(120),
  events: z.array(z.string()).min(1),
});

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 503 });
  }
  const auth = await assertAdminApi();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { data: webhook, error } = await auth.supabase
    .from("outbound_webhooks")
    .insert({ ...parsed.data, is_active: true })
    .select("id, name, target_url, secret_key, events, is_active, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ webhook }, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 503 });
  }
  const auth = await assertAdminApi();
  if ("error" in auth) return auth.error;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await auth.supabase.from("outbound_webhooks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
