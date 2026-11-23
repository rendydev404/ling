#!/usr/bin/env node
/**
 * Initializes clean production Storefront Settings (Neobrutalism Cyan & Purple)
 * and Keep-Alive Heartbeat in Supabase without any dummy/starter products or vouchers.
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

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "");
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

if (!supabaseUrl || !serviceKey) {
  console.error("[Supabase Seed] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates,return=representation",
};

const DUMMY_PRODUCT_IDS = [
  "11111111-1111-4111-8111-111111111101",
  "11111111-1111-4111-8111-111111111102",
  "11111111-1111-4111-8111-111111111103",
  "11111111-1111-4111-8111-111111111104",
  "11111111-1111-4111-8111-111111111105",
  "11111111-1111-4111-8111-111111111106",
  "11111111-1111-4111-8111-111111111107",
  "11111111-1111-4111-8111-111111111108",
];

const DUMMY_BLOCK_IDS = [
  "55555555-5555-4555-8555-555555555501",
  "55555555-5555-4555-8555-555555555502",
  "55555555-5555-4555-8555-555555555503",
  "55555555-5555-4555-8555-555555555504",
  "55555555-5555-4555-8555-555555555505",
];

async function upsert(table, payload, onConflict = "id") {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed seeding ${table} (${res.status}): ${errText}`);
  }
  return res.json();
}

async function deleteByInFilter(table, column, values) {
  const inList = values.map((v) => `"${v}"`).join(",");
  const res = await fetch(
    `${supabaseUrl}/rest/v1/${table}?${column}=in.(${encodeURIComponent(inList)})`,
    {
      method: "DELETE",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    }
  );
  if (!res.ok && res.status !== 404) {
    const errText = await res.text();
    console.warn(`[Supabase Seed] Warning cleaning ${table}: ${errText}`);
  }
}

export async function seedStorefront() {
  // 1. Purge any legacy dummy records if they existed previously
  await deleteByInFilter("bio_blocks", "id", DUMMY_BLOCK_IDS);
  await deleteByInFilter("products", "id", DUMMY_PRODUCT_IDS);
  await deleteByInFilter("vouchers", "code", ["LING20", "POTONG25K"]);

  // 2. Upsert clean production store_settings singleton with Neobrutalism Cyan & Purple theme
  await upsert(
    "store_settings",
    {
      singleton_key: "primary",
      brand_name: "Ling Studio",
      handle: "lingstudio",
      tagline: "Produk Digital, Kelas Online, & Konsultasi Eksklusif",
      bio: "Selamat datang di halaman resmi kami. Temukan produk, kelas online, dan layanan resmi di bawah ini.",
      verified_badge: true,
      theme_config: {
        preset: "neo-cyan",
        backgroundColor: "#f4f8fb",
        surfaceColor: "#ffffff",
        borderColor: "#0f172a",
        textColor: "#0f172a",
        mutedTextColor: "#334155",
        accentColor: "#22d3ee",
        accentTextColor: "#0f172a",
        secondaryAccentColor: "#a855f7",
        buttonRadius: "md",
      },
      social_links: [],
    },
    "singleton_key"
  );

  // 3. Upsert keepalive heartbeat
  await upsert(
    "keepalive_heartbeats",
    {
      key: "primary",
      source: "supabase-seed",
      ping_count: 1,
      last_ping_at: new Date().toISOString(),
    },
    "key"
  );

  console.log(
    "[Supabase Seed] Clean production store_settings (Neobrutalism Cyan & Purple) and keepalive_heartbeats initialized with zero dummy data!"
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  seedStorefront().catch((err) => {
    console.error("[Supabase Seed] Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
