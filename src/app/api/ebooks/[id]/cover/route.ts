import { NextResponse } from "next/server";
import { DriveError, fetchDriveMedia, fetchDriveThumbnail } from "@/lib/google-drive";
import { UUID_RE } from "@/lib/ebooks";
import { getEbookFiles } from "@/lib/ebook-files";

export const dynamic = "force-dynamic";

const DRIVE_THUMB_PREFIX = "drive-thumb:";

function isAllowedSupabaseCoverUrl(url: string): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  return Boolean(supabaseUrl && url.startsWith(`${supabaseUrl}/storage/v1/object/public/`));
}

/**
 * Cover image streamed via server proxy (either from Supabase Storage or Google Drive's
 * first-page thumbnail) so the underlying Drive file ID is never exposed to clients.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return new NextResponse(null, { status: 404 });

  const files = await getEbookFiles(id);
  const coverRef = files?.coverDriveFileId;
  if (!coverRef) return new NextResponse(null, { status: 404 });

  try {
    let upstream: Response;
    if (coverRef.startsWith("http://") || coverRef.startsWith("https://")) {
      if (!isAllowedSupabaseCoverUrl(coverRef)) {
        return new NextResponse(null, { status: 404 });
      }
      upstream = await fetch(coverRef, { next: { revalidate: 86400 } });
      if (!upstream.ok) return new NextResponse(null, { status: 404 });
    } else if (coverRef.startsWith(DRIVE_THUMB_PREFIX)) {
      upstream = await fetchDriveThumbnail(coverRef.slice(DRIVE_THUMB_PREFIX.length));
    } else {
      upstream = await fetchDriveMedia(coverRef);
    }

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
    return new NextResponse(null, { status: 404 });
  }
}
