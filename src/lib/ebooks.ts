export const EBOOK_MAX_BYTES = 200 * 1024 * 1024; // 200 MB
export const COVER_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
/** Upload chunk size: multiple of 256 KiB and safely under Vercel's 4.5 MB body limit. */
export const UPLOAD_CHUNK_BYTES = 15 * 256 * 1024;

export const isEbookMime = (mime: string) => mime === "application/pdf";
export const isCoverMime = (mime: string) => ["image/jpeg", "image/png", "image/webp"].includes(mime);

export interface MemberEbook {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  has_cover: boolean;
  page_count: number | null;
  file_size_bytes: number | null;
  created_at: string;
  updated_at: string;
  is_owned: boolean;
  access_source: "purchase" | "membership" | "gift" | null;
  last_page: number | null;
  total_pages: number | null;
  bookmarks: number[];
  last_read_at: string | null;
  buy_slug: string | null;
  buy_price: number | null;
}

export const ACCESS_LABEL: Record<NonNullable<MemberEbook["access_source"]>, string> = {
  purchase: "Dibeli",
  membership: "Membership",
  gift: "Akses Gratis",
};

export function ebookProgressPct(e: Pick<MemberEbook, "last_page" | "total_pages" | "page_count">): number {
  const total = e.total_pages ?? e.page_count ?? 0;
  if (!e.last_page || total <= 0) return 0;
  return Math.min(100, Math.round((e.last_page / total) * 100));
}

export function coverUrl(ebookId: string, version?: string | null): string {
  return `/api/ebooks/${ebookId}/cover${version ? `?v=${encodeURIComponent(version)}` : ""}`;
}

export const GRANT_COLS = "id, email, user_id, ebook_id, note, expires_at, created_at";
export const ADMIN_EBOOK_COLS =
  "id, title, author, description, drive_file_id, cover_drive_file_id, mime_type, file_size_bytes, page_count, status, created_at, updated_at, product_ebooks(product_id)";

export interface AdminEbook {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  drive_file_id: string;
  cover_drive_file_id: string | null;
  mime_type: string;
  file_size_bytes: number | null;
  page_count: number | null;
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
  product_ebooks: Array<{ product_id: string }>;
}

export interface EbookGrant {
  id: string;
  email: string;
  user_id: string | null;
  ebook_id: string | null;
  note: string | null;
  expires_at: string | null;
  created_at: string;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "-";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
