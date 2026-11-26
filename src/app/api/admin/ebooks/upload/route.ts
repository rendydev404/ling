import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdminApi } from "@/lib/supabase/auth";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import {
  DriveError,
  createResumableUpload,
  isDriveConfigured,
  isDriveUploadSessionUrl,
  uploadChunk,
} from "@/lib/google-drive";
import { COVER_MAX_BYTES, EBOOK_MAX_BYTES, UPLOAD_CHUNK_BYTES, isCoverMime, isEbookMime } from "@/lib/ebooks";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const startSchema = z.object({
  kind: z.enum(["ebook", "cover"]),
  name: z.string().min(1).max(200),
  mimeType: z.string().min(3).max(100),
  size: z.number().int().positive(),
});

function fail(err: unknown) {
  if (err instanceof DriveError) {
    return NextResponse.json({ error: err.message }, { status: err.status >= 400 ? err.status : 502 });
  }
  console.error("[ebook-upload]", err);
  return NextResponse.json({ error: "Upload gagal." }, { status: 500 });
}

/** Starts a private, resumable Drive upload. */
export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 503 });
  }
  const auth = await assertAdminApi();
  if ("error" in auth) return auth.error;
  if (!isDriveConfigured()) {
    return NextResponse.json({ error: "Google Drive belum dikonfigurasi di server." }, { status: 503 });
  }

  const parsed = startSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data upload tidak valid." }, { status: 400 });
  const { kind, name, mimeType, size } = parsed.data;

  if (kind === "ebook" && (!isEbookMime(mimeType) || size > EBOOK_MAX_BYTES)) {
    return NextResponse.json({ error: "Ebook harus PDF dan maksimal 200 MB." }, { status: 400 });
  }
  if (kind === "cover" && (!isCoverMime(mimeType) || size > COVER_MAX_BYTES)) {
    return NextResponse.json({ error: "Cover harus JPG/PNG/WebP dan maksimal 5 MB." }, { status: 400 });
  }

  try {
    const sessionUrl = await createResumableUpload({ name, mimeType, size });
    return NextResponse.json({ sessionUrl, chunkSize: UPLOAD_CHUNK_BYTES });
  } catch (err) {
    return fail(err);
  }
}

/** Relays one chunk (≤ 3.75 MB) of the upload to Drive. */
export async function PUT(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 503 });
  }
  const auth = await assertAdminApi();
  if ("error" in auth) return auth.error;

  const sessionUrl = request.headers.get("x-upload-session") ?? "";
  const contentRange = request.headers.get("content-range") ?? "";
  if (!isDriveUploadSessionUrl(sessionUrl) || !/^bytes \d+-\d+\/\d+$/.test(contentRange)) {
    return NextResponse.json({ error: "Sesi upload tidak valid." }, { status: 400 });
  }

  const chunk = await request.arrayBuffer();
  if (chunk.byteLength === 0 || chunk.byteLength > UPLOAD_CHUNK_BYTES) {
    return NextResponse.json({ error: "Ukuran potongan upload tidak valid." }, { status: 400 });
  }

  try {
    return NextResponse.json(await uploadChunk(sessionUrl, chunk, contentRange));
  } catch (err) {
    return fail(err);
  }
}
