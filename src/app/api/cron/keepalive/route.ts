import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!isSupabaseServerConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase is not configured" },
      { status: 503 }
    );
  }

  const startedAt = Date.now();
  const serviceClient = createServiceRoleClient();

  if (serviceClient) {
    const { data: existing } = await serviceClient
      .from("keepalive_heartbeats")
      .select("ping_count")
      .eq("key", "primary")
      .single();

    const nextCount = Number(existing?.ping_count ?? 0) + 1;

    const { error: upsertErr } = await serviceClient
      .from("keepalive_heartbeats")
      .upsert(
        {
          key: "primary",
          source: "api-cron-keepalive",
          ping_count: nextCount,
          last_ping_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

    if (!upsertErr) {
      return NextResponse.json({
        ok: true,
        mode: "database-heartbeat",
        pingCount: nextCount,
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Fallback read query if service role or heartbeat table is not yet initialized
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("store_settings")
    .select("singleton_key")
    .eq("singleton_key", "primary")
    .limit(1);

  return NextResponse.json({
    ok: true,
    mode: error ? "connection-ping" : "store-settings-read",
    latencyMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  });
}
