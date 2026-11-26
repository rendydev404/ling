import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DriveError, fetchDriveMedia } from "@/lib/google-drive";
import { UUID_RE } from "@/lib/ebooks";
import { getEbookFiles } from "@/lib/ebook-files";
import { readerCookieName, verifyReaderToken } from "@/lib/reader-token";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PASS_THROUGH = ["content-length", "content-range", "etag", "last-modified"];

function deny(message: string, status = 403) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Streams the PDF bytes (with HTTP Range support for the viewer's lazy page loading)
 * from the private Drive folder. Requires the per-member pass cookie set by
 * POST /api/member/ebooks/[id]/session; never redirects to or reveals a Drive URL.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return deny("Ebook tidak ditemukan.", 404);

  // Only the in-page viewer may fetch this: block opening it as a tab/download, embedding it
  // elsewhere, and cross-site requests. (Browsers always send these headers on fetch.)
  const dest = request.headers.get("sec-fetch-dest");
  const site = request.headers.get("sec-fetch-site");
  if ((dest && dest !== "empty") || (site && site !== "same-origin")) {
    return deny("Ebook hanya bisa dibaca melalui reader di Member Area.");
  }

  const cookieStore = await cookies();
  const userId = verifyReaderToken(id, cookieStore.get(readerCookieName(id))?.value);
  if (!userId) return deny("Sesi baca berakhir. Muat ulang halaman reader.", 401);

  const files = await getEbookFiles(id);
  if (!files) return deny("Ebook tidak ditemukan.", 404);

  const range = request.headers.get("range");
  if (range && !/^bytes=\d*-\d*$/.test(range)) return deny("Range tidak valid.", 416);

  try {
    const upstream = await fetchDriveMedia(files.driveFileId, range);
    const headers = new Headers({
      "Content-Type": files.mimeType || "application/pdf",
      "Accept-Ranges": "bytes",
      "Content-Disposition": "inline",
      // no-transform keeps compression from breaking byte ranges / Content-Length.
      "Cache-Control": "private, no-store, no-transform",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    });
    for (const name of PASS_THROUGH) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (err) {
    if (err instanceof DriveError) {
      console.error("[reader]", err.message);
      return deny("File ebook sedang tidak bisa dibuka.", err.status === 416 ? 416 : 502);
    }
    throw err;
  }
}
