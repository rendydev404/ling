import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdminApi } from "@/lib/supabase/auth";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { DriveError, fetchDriveThumbnail, probeDrivePdf } from "@/lib/google-drive";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const inspectSchema = z.object({
  drive_url: z.string().trim().min(5).max(1000),
});

function fail(err: unknown) {
  if (err instanceof DriveError) {
    return NextResponse.json({ error: err.message }, { status: err.status >= 400 ? err.status : 502 });
  }
  console.error("[ebook-inspect]", err);
  return NextResponse.json({ error: "Gagal memeriksa link Google Drive." }, { status: 500 });
}

/** Admin preview of the auto-generated Google Drive PDF thumbnail before saving. */
export async function GET(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return new NextResponse(null, { status: 503 });
  }
  const auth = await assertAdminApi();
  if ("error" in auth) return auth.error;

  const fileId = new URL(request.url).searchParams.get("thumb")?.trim() ?? "";
  if (!fileId) return new NextResponse(null, { status: 400 });

  try {
    const upstream = await fetchDriveThumbnail(fileId);
    const headers = new Headers({
      "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    });
    return new Response(upstream.body, { status: 200, headers });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

/** Validates a Google Drive share link, confirming public-link access and %PDF- signature. */
export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 503 });
  }
  const auth = await assertAdminApi();
  if ("error" in auth) return auth.error;

  const parsed = inspectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Masukkan link Google Drive yang valid." }, { status: 400 });
  }

  try {
    const info = await probeDrivePdf(parsed.data.drive_url);
    return NextResponse.json({
      fileId: info.fileId,
      fileName: info.fileName,
      fileSizeBytes: info.fileSizeBytes,
      thumbPreviewUrl: `/api/admin/ebooks/upload?thumb=${encodeURIComponent(info.fileId)}`,
    });
  } catch (err) {
    return fail(err);
  }
}
