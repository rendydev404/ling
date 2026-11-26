import { NextResponse } from "next/server";
import { DriveError, fetchDriveMedia } from "@/lib/google-drive";
import { UUID_RE } from "@/lib/ebooks";
import { getEbookFiles } from "@/lib/ebook-files";

export const dynamic = "force-dynamic";

/**
 * Cover image (not sensitive) streamed from Drive. Responses are cached hard by the CDN and
 * browser; URLs carry ?v=<updated_at> so a replaced cover busts the cache.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return new NextResponse(null, { status: 404 });

  const files = await getEbookFiles(id);
  if (!files?.coverDriveFileId) return new NextResponse(null, { status: 404 });

  try {
    const upstream = await fetchDriveMedia(files.coverDriveFileId);
    const headers = new Headers({
      "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    });
    const len = upstream.headers.get("content-length");
    if (len) headers.set("Content-Length", len);
    return new Response(upstream.body, { status: 200, headers });
  } catch (err) {
    if (err instanceof DriveError) return new NextResponse(null, { status: 404 });
    throw err;
  }
}
