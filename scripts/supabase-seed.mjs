#!/usr/bin/env node
/**
 * Seeds initial Storefront Settings, Starter Products, Bio Blocks, Course Content,
 * Appointment Availability, and Vouchers into Supabase idempotently.
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

const IDS = {
  prodDigital1: "11111111-1111-4111-8111-111111111101",
  prodDigital2: "11111111-1111-4111-8111-111111111102",
  prodCourse1: "11111111-1111-4111-8111-111111111103",
  prodAppoint1: "11111111-1111-4111-8111-111111111104",
  prodEvent1: "11111111-1111-4111-8111-111111111105",
  prodPhys1: "11111111-1111-4111-8111-111111111106",
  prodMember1: "11111111-1111-4111-8111-111111111107",
  prodDonation1: "11111111-1111-4111-8111-111111111108",
  sec1: "22222222-2222-4222-8222-222222222201",
  sec2: "22222222-2222-4222-8222-222222222202",
};

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

export async function seedStorefront() {
  // 1. Store settings
  await upsert(
    "store_settings",
    {
      singleton_key: "primary",
      brand_name: "Ling Studio",
      handle: "lingstudio",
      tagline: "Creator Commerce, Digital Products & Mentorship",
      bio: "Bantu kamu membangun produk digital, bisnis online, dan sistem monetisasi yang rapi. Pilih produk, kelas, atau sesi konsultasi di bawah ini.",
      verified_badge: true,
      social_links: [
        { platform: "instagram", url: "https://instagram.com", label: "Instagram" },
        { platform: "tiktok", url: "https://tiktok.com", label: "TikTok" },
        { platform: "youtube", url: "https://youtube.com", label: "YouTube" },
        { platform: "whatsapp", url: "https://wa.me/6281234567890", label: "WhatsApp" },
      ],
    },
    "singleton_key"
  );

  // 2. Starter Products (insert base products first, then wire order bumps)
  await upsert(
    "products",
    [
      {
        id: IDS.prodDigital2,
        slug: "ebook-copywriting-konversi",
        type: "digital",
        title: "Playbook Copywriting Konversi Tinggi (PDF)",
        short_description:
          "50+ formula headline, landing page, dan script WhatsApp closing yang terbukti laris.",
        description:
          "E-book praktis 120 halaman berisi studi kasus nyata dan template siap pakai untuk meningkatkan konversi penjualan produk digital maupun fisik.",
        price: 79000,
        compare_at_price: 129000,
        status: "published",
        is_featured: false,
        affiliate_enabled: true,
        affiliate_commission_pct: 25,
        metadata: {
          delivery_note: "File PDF resolusi tinggi siap diunduh langsung dari Buyer Portal.",
        },
      },
      {
        id: IDS.prodDigital1,
        slug: "notion-creator-os-template",
        type: "digital",
        title: "Notion Creator OS & Finance Tracker",
        short_description:
          "Template Notion all-in-one untuk manajemen konten, produk digital, dan arus kas bulanan.",
        description:
          "Kelola seluruh operasional bisnis kreator kamu dalam satu workspace rapi. Termasuk Content Calendar, Product Launch Checklist, CRM Klien, serta Dashboard Keuangan otomatis.",
        price: 99000,
        compare_at_price: 199000,
        status: "published",
        is_featured: true,
        order_bump_product_id: IDS.prodDigital2,
        order_bump_price: 39000,
        order_bump_headline: "Tambahkan Playbook Copywriting (Hemat 50%)",
        affiliate_enabled: true,
        affiliate_commission_pct: 30,
        metadata: {
          delivery_note:
            "Link duplikasi Notion & panduan PDF tersedia langsung setelah pembayaran terkonfirmasi.",
        },
      },
      {
        id: IDS.prodCourse1,
        slug: "kelas-bangun-bisnis-digital",
        type: "course",
        title: "Masterclass: Bangun Bisnis Produk Digital dari Nol",
        short_description:
          "Video materi terstruktur dari riset ide, pembuatan produk, hingga automasi funnel & Midtrans.",
        description:
          "Pelajari langkah demi langkah membangun ekosistem produk digital yang menghasilkan penjualan harian secara konsisten. Akses seumur hidup + update materi gratis.",
        price: 299000,
        compare_at_price: 499000,
        status: "published",
        is_featured: true,
        order_bump_product_id: IDS.prodDigital1,
        order_bump_price: 59000,
        order_bump_headline: "Bundling Notion Creator OS hanya Rp59.000",
        affiliate_enabled: true,
        affiliate_commission_pct: 25,
        metadata: { course_level: "beginner", certificate_enabled: true },
      },
      {
        id: IDS.prodAppoint1,
        slug: "konsultasi-1on1-strategi-monetisasi",
        type: "appointment",
        title: "Sesi 1-on-1 Audit Funnel & Strategi Monetisasi (60 Menit)",
        short_description:
          "Bedah langsung penawaran, halaman jualan, dan strategi konversi bersama saya via Google Meet.",
        description:
          "Sesi privat 60 menit untuk membedah kendala bisnis digitalmu dan menyusun action plan 30 hari.",
        price: 350000,
        compare_at_price: 500000,
        status: "published",
        is_featured: false,
        affiliate_enabled: false,
        affiliate_commission_pct: 0,
        metadata: {
          duration_minutes: 60,
          buffer_minutes: 15,
          meeting_link: "https://meet.google.com/new",
        },
      },
      {
        id: IDS.prodEvent1,
        slug: "live-workshop-ai-creator-workflow",
        type: "event",
        title: "Live Workshop: AI Workflow untuk Kreator",
        short_description:
          "Workshop interaktif 3 jam + sesi tanya jawab langsung dan rekaman ulang.",
        description:
          "Praktik langsung menyusun sistem produksi konten dan produk digital 5x lebih cepat.",
        price: 149000,
        compare_at_price: 249000,
        status: "published",
        stock_quantity: 100,
        affiliate_enabled: true,
        affiliate_commission_pct: 20,
        metadata: {
          event_date: "2026-12-12",
          event_time: "19:30 WIB",
          event_location: "Zoom Live Webinar",
        },
      },
      {
        id: IDS.prodPhys1,
        slug: "creator-desk-journal-hardcover",
        type: "physical",
        title: "Creator Focus Journal — Hardcover Edition",
        short_description:
          "Jurnal fisik 90 hari dengan kertas 100gsm premium untuk merancang target harian.",
        description:
          "Dicetak eksklusif dengan sampul linen hardcover dan pembatas pita ganda.",
        price: 135000,
        compare_at_price: 175000,
        status: "published",
        stock_quantity: 45,
        affiliate_enabled: true,
        affiliate_commission_pct: 15,
        metadata: {},
      },
      {
        id: IDS.prodMember1,
        slug: "ling-inner-circle-membership",
        type: "membership",
        title: "Inner Circle Creator Club (Akses 30 Hari)",
        short_description:
          "Grup diskusi privat, sesi live bulanan, dan akses seluruh template terbaru.",
        description:
          "Komunitas eksklusif kreator & solopreneur Indonesia untuk bertumbuh bersama.",
        price: 129000,
        status: "published",
        affiliate_enabled: true,
        affiliate_commission_pct: 20,
        metadata: {
          duration_days: 30,
          community_invite_url: "https://t.me/+linginnercircle",
        },
      },
      {
        id: IDS.prodDonation1,
        slug: "traktir-kopi-dukungan-karya",
        type: "donation",
        title: "Traktir Kopi & Dukungan Karya",
        short_description:
          "Kirim dukungan sukarela dan pesan semangat agar saya terus berbagi konten gratis.",
        description:
          "Setiap dukungan sangat berarti untuk riset dan produksi materi edukasi gratis berikutnya.",
        price: 25000,
        is_pay_what_you_want: true,
        min_price: 10000,
        status: "published",
        affiliate_enabled: false,
        affiliate_commission_pct: 0,
        metadata: { preset_amounts: [15000, 25000, 50000, 100000] },
      },
    ],
    "slug"
  );

  // 3. Variants, Course Sections/Lessons, Appointment Availability, Bio Blocks, Vouchers
  await upsert("product_variants", [
    {
      id: "33333333-3333-4333-8333-333333333301",
      product_id: IDS.prodPhys1,
      name: "Midnight Black",
      sku: "JRN-BLK-01",
      price_override: null,
      stock_quantity: 25,
      weight_grams: 350,
      is_active: true,
    },
    {
      id: "33333333-3333-4333-8333-333333333302",
      product_id: IDS.prodPhys1,
      name: "Emerald Forest (Bundling Sticker)",
      sku: "JRN-EMR-02",
      price_override: 149000,
      stock_quantity: 20,
      weight_grams: 380,
      is_active: true,
    },
  ]);

  await upsert("course_sections", [
    {
      id: IDS.sec1,
      product_id: IDS.prodCourse1,
      title: "Modul 1: Fondasi & Validasi Ide Produk Digital",
      sort_order: 1,
    },
    {
      id: IDS.sec2,
      product_id: IDS.prodCourse1,
      title: "Modul 2: Funnel, Midtrans & Pertumbuhan Affiliate",
      sort_order: 2,
    },
  ]);

  await upsert("course_lessons", [
    {
      id: "44444444-4444-4444-8444-444444444401",
      section_id: IDS.sec1,
      product_id: IDS.prodCourse1,
      title: "Menemukan Masalah Spesifik yang Rela Dibayar Pasar",
      content_type: "video",
      video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      body_markdown: "Ringkasan framework validasi 48 jam sebelum membuat produk penuh.",
      duration_minutes: 14,
      is_free_preview: true,
      sort_order: 1,
    },
    {
      id: "44444444-4444-4444-8444-444444444402",
      section_id: IDS.sec2,
      product_id: IDS.prodCourse1,
      title: "Strategi Order Bump & Otomatisasi Pembayaran Midtrans",
      content_type: "article",
      body_markdown:
        "Cara menaikkan rata-rata nilai transaksi (AOV) hingga 35% dengan penawaran pendamping yang relevan.",
      duration_minutes: 18,
      is_free_preview: false,
      sort_order: 2,
    },
  ]);

  await upsert(
    "appointment_availability",
    [1, 2, 3, 4, 5].map((day) => ({
      product_id: IDS.prodAppoint1,
      day_of_week: day,
      start_time: "09:00",
      end_time: "17:00",
      is_active: true,
    })),
    "product_id,day_of_week"
  );

  // Only seed bio_blocks if empty so we never overwrite custom builder edits
  const existingBlocksRes = await fetch(
    `${supabaseUrl}/rest/v1/bio_blocks?select=id&limit=1`,
    { headers }
  );
  const existingBlocks = existingBlocksRes.ok ? await existingBlocksRes.json() : [];
  if (Array.isArray(existingBlocks) && existingBlocks.length === 0) {
    await upsert("bio_blocks", [
      {
        id: "55555555-5555-4555-8555-555555555501",
        type: "heading",
        title: "Produk Unggulan & Kelas Terpopuler",
        sort_order: 1,
        is_active: true,
      },
      {
        id: "55555555-5555-4555-8555-555555555502",
        type: "product",
        product_id: IDS.prodCourse1,
        badge_text: "BESTSELLER",
        layout_style: "featured",
        sort_order: 2,
        is_active: true,
      },
      {
        id: "55555555-5555-4555-8555-555555555503",
        type: "product",
        product_id: IDS.prodDigital1,
        badge_text: "POPULER",
        layout_style: "compact",
        sort_order: 3,
        is_active: true,
      },
      {
        id: "55555555-5555-4555-8555-555555555504",
        type: "product",
        product_id: IDS.prodAppoint1,
        layout_style: "compact",
        sort_order: 4,
        is_active: true,
      },
      {
        id: "55555555-5555-4555-8555-555555555505",
        type: "product",
        product_id: IDS.prodDonation1,
        layout_style: "compact",
        sort_order: 5,
        is_active: true,
      },
    ]);
  }

  await upsert(
    "vouchers",
    [
      {
        code: "LING20",
        discount_type: "percentage",
        discount_value: 20,
        max_discount_amount: 100000,
        min_order_amount: 50000,
        max_uses: 200,
        is_active: true,
      },
      {
        code: "POTONG25K",
        discount_type: "fixed",
        discount_value: 25000,
        max_discount_amount: null,
        min_order_amount: 100000,
        max_uses: 50,
        is_active: true,
      },
    ],
    "code"
  );

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

  console.log("[Supabase Seed] Successfully seeded store_settings, 8 products, variants, course modules, bio_blocks, vouchers, and keepalive heartbeat!");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  seedStorefront().catch((err) => {
    console.error("[Supabase Seed] Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
