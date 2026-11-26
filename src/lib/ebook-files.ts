import { createServiceRoleClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Server-only lookup of the private Drive ids behind an ebook, cached per instance so the
// reader's Range requests and cover hits don't each cost a database round-trip.
// ---------------------------------------------------------------------------
interface EbookFiles {
  driveFileId: string;
  coverDriveFileId: string | null;
  mimeType: string;
  status: string;
}

const FILES_TTL_MS = 5 * 60 * 1000;
const filesCache = new Map<string, { value: EbookFiles | null; expiresAt: number }>();

export async function getEbookFiles(ebookId: string): Promise<EbookFiles | null> {
  const hit = filesCache.get(ebookId);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const supabase = createServiceRoleClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("ebooks")
    .select("drive_file_id, cover_drive_file_id, mime_type, status")
    .eq("id", ebookId)
    .maybeSingle();

  const value: EbookFiles | null = data
    ? {
        driveFileId: data.drive_file_id,
        coverDriveFileId: data.cover_drive_file_id,
        mimeType: data.mime_type,
        status: data.status,
      }
    : null;
  if (filesCache.size > 500) filesCache.clear();
  filesCache.set(ebookId, { value, expiresAt: Date.now() + FILES_TTL_MS });
  return value;
}

export function forgetEbookFiles(ebookId: string) {
  filesCache.delete(ebookId);
}
