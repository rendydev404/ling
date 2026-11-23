#!/usr/bin/env node
/**
 * Supabase Full Reset & Overwrite Runner
 * Drops all old tables/functions/enums and applies supabase/reset_and_migrate.sql
 * via Supabase Management API (SUPABASE_ACCESS_TOKEN=sbp_...) or psql (DATABASE_URL),
 * then seeds starter storefront data.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { seedStorefront } from "./supabase-seed.mjs";

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
const projectRefMatch = supabaseUrl.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co$/i);
const projectRef = projectRefMatch ? projectRefMatch[1] : "";
const sqlPath = path.join(rootDir, "supabase", "reset_and_migrate.sql");
const sqlContent = fs.readFileSync(sqlPath, "utf8");

async function runReset() {
  const accessToken = (process.env.SUPABASE_ACCESS_TOKEN || "").trim();
  const databaseUrl = (process.env.DATABASE_URL || "").trim();

  if (accessToken && projectRef) {
    console.log(`[Supabase Reset] Executing reset_and_migrate.sql on project ${projectRef} via Supabase Management API...`);
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sqlContent }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Management API SQL execution failed (${res.status}): ${errText}`);
    }
    console.log("[Supabase Reset] Schema reset and migration succeeded!");
  } else if (databaseUrl) {
    console.log("[Supabase Reset] Executing reset_and_migrate.sql via psql DATABASE_URL...");
    execFileSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", sqlPath], {
      stdio: "inherit",
    });
    console.log("[Supabase Reset] Schema reset and migration succeeded!");
  } else {
    console.error(`
[Supabase Reset] Untuk mengeksekusi DROP TABLE & CREATE TABLE otomatis dari terminal, berikan salah satu:
  1) SUPABASE_ACCESS_TOKEN=sbp_... npm run supabase:reset
     (Buat token di: https://supabase.com/dashboard/account/tokens)
  ATAU
  2) Tempel isi file supabase/reset_and_migrate.sql langsung ke Supabase SQL Editor:
     https://supabase.com/dashboard/project/${projectRef || "your-project"}/sql/new
     lalu jalankan: npm run supabase:seed
`);
    process.exit(1);
  }

  // Wait briefly for PostgREST schema cache reload, then seed starter storefront data
  await new Promise((r) => setTimeout(r, 2000));
  await seedStorefront();
}

runReset().catch((err) => {
  console.error("[Supabase Reset] Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
