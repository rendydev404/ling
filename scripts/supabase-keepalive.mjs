#!/usr/bin/env node
/**
 * Supabase Anti-Pause Keep-Alive Script
 * Prevents Supabase Free Tier from pausing after 7 days of inactivity
 * by executing real PostgREST read/write + Auth/Storage health queries.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function loadEnvFile(filename) {
  const filePath = path.join(rootDir, filename);
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const supabaseUrl = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ""
)
  .trim()
  .replace(/\/+$/, "");

const supabaseKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ""
).trim();

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("your-project-ref")) {
  console.error(
    "[Supabase Keep-Alive] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
  process.exit(1);
}

const source = process.env.KEEPALIVE_SOURCE || "cli-keepalive";

async function runKeepAlive() {
  const startedAt = Date.now();
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
  };

  let mode = "database-heartbeat";
  let pingCount = null;

  // 1. Try reading & updating public.keepalive_heartbeats (real Postgres SELECT + UPDATE)
  const readRes = await fetch(
    `${supabaseUrl}/rest/v1/keepalive_heartbeats?key=eq.primary&select=key,ping_count,last_ping_at`,
    { headers }
  );

  if (readRes.ok) {
    const rows = await readRes.json();
    const currentCount =
      Array.isArray(rows) && rows[0] ? Number(rows[0].ping_count || 0) : 0;
    const nextCount = currentCount + 1;

    const upsertRes = await fetch(
      `${supabaseUrl}/rest/v1/keepalive_heartbeats?on_conflict=key`,
      {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          key: "primary",
          source,
          ping_count: nextCount,
          last_ping_at: new Date().toISOString(),
        }),
      }
    );

    if (upsertRes.ok) {
      pingCount = nextCount;
    } else {
      // Read succeeded with anon key; also touch store_settings
      mode = "database-read";
    }
  } else {
    // Fallback if keepalive_heartbeats table has not been migrated yet:
    // Hit PostgREST schema endpoint + Storage buckets + Auth health to register real project activity
    mode = "postgrest-storage-ping";
    const [restRes, storageRes, authRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/`, { headers }),
      fetch(`${supabaseUrl}/storage/v1/bucket`, { headers }),
      fetch(`${supabaseUrl}/auth/v1/health`, { headers }),
    ]);

    if (!restRes.ok && !storageRes.ok && !authRes.ok) {
      throw new Error(
        `Keep-alive failed: REST=${restRes.status}, Storage=${storageRes.status}, Auth=${authRes.status}`
      );
    }
  }

  // Also query store_settings if available to warm PostgREST connection pool
  await fetch(
    `${supabaseUrl}/rest/v1/store_settings?singleton_key=eq.primary&select=singleton_key`,
    { headers }
  ).catch(() => null);

  const elapsedMs = Date.now() - startedAt;
  console.log(
    JSON.stringify({
      ok: true,
      project: supabaseUrl,
      mode,
      source,
      pingCount,
      latencyMs: elapsedMs,
      timestamp: new Date().toISOString(),
    })
  );
}

runKeepAlive().catch((err) => {
  console.error("[Supabase Keep-Alive] Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
