import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/supabase/auth";
import { createServiceRoleClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const COVER_BUCKET = "public-media";
const MAX_COVER_BYTES = 5 * 1024 * 1024; // 5 MB

interface DetectedImage {
  ext: "jpg" | "png" | "webp" | "avif";
  mime: "image/jpeg" | "image/png" | "image/webp" | "image/avif";
}

function detectImageType(buf: Buffer): DetectedImage | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { ext: "png", mime: "image/png" };
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { ext: "webp", mime: "image/webp" };
  }

  // AVIF: .... "ftyp" ("avif" | "avis" | "mif1")
  if (buf.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buf.subarray(8, 12).toString("ascii");
    if (brand === "avif" || brand === "avis") {
      return { ext: "avif", mime: "image/avif" };
    }
  }

  return null;
}

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi di server." },
      { status: 503 }
    );
  }

  const auth = await assertAdminApi();
  if ("error" in auth) return auth.error;

  const formData = await request.formData().catch(() => null);
  const entry = formData?.get("file");
  if (!(entry instanceof File)) {
    return NextResponse.json({ error: "File gambar cover tidak ditemukan." }, { status: 400 });
  }

  if (entry.size <= 0 || entry.size > MAX_COVER_BYTES) {
    return NextResponse.json(
      { error: "Ukuran gambar cover maksimal 5 MB." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await entry.arrayBuffer());
  const detected = detectImageType(buffer);
  if (!detected) {
    return NextResponse.json(
      { error: "Format gambar cover harus JPG, PNG, WebP, atau AVIF." },
      { status: 400 }
    );
  }

  const storageClient = createServiceRoleClient() ?? auth.supabase;
  const objectPath = `product-covers/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${detected.ext}`;

  let uploadRes = await storageClient.storage.from(COVER_BUCKET).upload(objectPath, buffer, {
    contentType: detected.mime,
    cacheControl: "31536000",
    upsert: false,
  });

  if (uploadRes.error && /bucket.*not found/i.test(uploadRes.error.message)) {
    const serviceClient = createServiceRoleClient();
    if (serviceClient) {
      await serviceClient.storage.createBucket(COVER_BUCKET, {
        public: true,
        fileSizeLimit: MAX_COVER_BYTES,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
      });
      uploadRes = await serviceClient.storage.from(COVER_BUCKET).upload(objectPath, buffer, {
        contentType: detected.mime,
        cacheControl: "31536000",
        upsert: false,
      });
    }
  }

  if (uploadRes.error) {
    return NextResponse.json(
      { error: `Gagal mengunggah cover: ${uploadRes.error.message}` },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = storageClient.storage.from(COVER_BUCKET).getPublicUrl(objectPath);

  return NextResponse.json({ url: publicUrl, path: objectPath }, { status: 201 });
}
