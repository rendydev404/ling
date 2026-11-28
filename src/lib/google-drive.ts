/**
 * Google Drive private-proxy helper (Zero-OAuth Link Mode).
 *
 * Admin cukup mengunggah PDF ke Google Drive biasa dengan akses "Siapa saja yang memiliki link
 * (Pelihat / Viewer)" lalu menempelkan link-nya di Admin Area.
 *
 * Browser member TIDAK PERNAH melihat link atau ID Google Drive asli:
 * - Streaming halaman PDF melewati proxy server `/api/reader/[id]` (mendukung HTTP Range).
 * - Thumbnail cover melewati proxy server `/api/ebooks/[id]/cover`.
 */

const DOWNLOAD_URL = "https://drive.usercontent.google.com/download";
const THUMBNAIL_URL = "https://drive.google.com/thumbnail";
const USER_AGENT = "Mozilla/5.0 (compatible; LingStorefrontReader/1.0)";

const FILE_ID_RE = /^[A-Za-z0-9_-]{10,120}$/;

export class DriveError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export interface ProbedDrivePdf {
  fileId: string;
  fileName: string | null;
  fileSizeBytes: number | null;
  mimeType: "application/pdf";
}

// Cache virus-scan confirmation parameters (for large PDFs >100 MB) for 10 minutes
// so PDF.js Range requests stay single-hop.
const confirmParamsCache = new Map<string, { params: Record<string, string>; expiresAt: number }>();
const CONFIRM_TTL_MS = 10 * 60 * 1000;

/**
 * Extracts a clean Google Drive file ID from a share URL or raw ID.
 */
export function parseDriveFileId(rawInput: string): string {
  const input = rawInput.trim();
  if (!input) {
    throw new DriveError("Masukkan link file PDF Google Drive terlebih dahulu.", 400);
  }

  if (/\/folders\/[A-Za-z0-9_-]+/i.test(input)) {
    throw new DriveError(
      "Link tersebut adalah Folder Google Drive. Klik kanan file PDF-nya langsung lalu pilih Bagikan > Salin link.",
      400
    );
  }

  if (/docs\.google\.com\/(document|spreadsheets|presentation)\//i.test(input)) {
    throw new DriveError(
      "Link tersebut adalah dokumen Google Docs/Sheets/Slides. Ekspor sebagai file PDF lalu unggah ke Google Drive.",
      400
    );
  }

  if (FILE_ID_RE.test(input) && input.length >= 15) {
    return input;
  }

  const pathMatch = input.match(/\/(?:file\/)?d\/([A-Za-z0-9_-]{10,120})(?:[/?#]|$)/i);
  if (pathMatch?.[1]) {
    return pathMatch[1];
  }

  try {
    const parsed = new URL(input);
    const idParam = parsed.searchParams.get("id")?.trim();
    if (idParam && FILE_ID_RE.test(idParam)) {
      return idParam;
    }
  } catch {
    // Fall through to generic validation error below.
  }

  throw new DriveError(
    "Format link Google Drive tidak dikenali. Gunakan link seperti https://drive.google.com/file/d/.../view",
    400
  );
}

export function buildDriveViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;
}

/** Always ready in Link Proxy mode (no OAuth env vars required). */
export function isDriveConfigured(): boolean {
  return true;
}

export function extractConfirmFormParams(html: string): Record<string, string> | null {
  if (!/download-form/i.test(html) && !/name=["']uuid["']/i.test(html)) {
    return null;
  }
  const params: Record<string, string> = {};
  const inputRe = /<input\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = inputRe.exec(html)) !== null) {
    const tag = match[0];
    const name = tag.match(/\bname=["']([^"']+)["']/i)?.[1];
    const value = tag.match(/\bvalue=["']([^"']*)["']/i)?.[1];
    if (name && value !== undefined) {
      params[name] = value;
    }
  }
  return params.uuid || params.confirm ? params : null;
}

export function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null;

  const utf8Match = header.match(/filename\*\s*=\s*UTF-8''([^;\r\n]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim().replace(/^["']|["']$/g, ""));
    } catch {
      // Fallback to regular filename=
    }
  }

  const quotedMatch = header.match(/filename\s*=\s*"([^"]+)"/i);
  if (quotedMatch?.[1]) return quotedMatch[1].trim();

  const plainMatch = header.match(/filename\s*=\s*([^;\r\n]+)/i);
  if (plainMatch?.[1]) return plainMatch[1].trim().replace(/^["']|["']$/g, "");

  return null;
}

export function parseTotalBytesFromHeaders(headers: Headers, status: number): number | null {
  const contentRange = headers.get("content-range");
  if (contentRange) {
    const totalMatch = contentRange.match(/\/(\d+)\s*$/);
    if (totalMatch?.[1]) {
      const total = Number(totalMatch[1]);
      if (Number.isFinite(total) && total > 0) return total;
    }
  }
  if (status === 200) {
    const len = Number(headers.get("content-length") ?? "");
    if (Number.isFinite(len) && len > 0) return len;
  }
  return null;
}

function buildDownloadUrl(fileId: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams({
    id: fileId,
    export: "download",
    confirm: "t",
    ...(extra ?? {}),
  });
  return `${DOWNLOAD_URL}?${params.toString()}`;
}

function isLoginRedirect(url: string, html?: string): boolean {
  if (/accounts\.google\.com|ServiceLogin/i.test(url)) return true;
  if (html && /accounts\.google\.com|ServiceLogin/i.test(html)) return true;
  return false;
}

function restrictedError(): DriveError {
  return new DriveError(
    "File Google Drive masih dikunci (Restricted). Buka Bagikan di Google Drive lalu ubah akses umum menjadi 'Siapa saja yang memiliki link (Pelihat)'.",
    403
  );
}

/**
 * Streams file bytes from Google Drive via server-side proxy, forwarding optional HTTP Range.
 */
export async function fetchDriveMedia(fileId: string, range?: string | null): Promise<Response> {
  if (!FILE_ID_RE.test(fileId)) {
    throw new DriveError("ID file Google Drive tidak valid.", 400);
  }

  const reqHeaders: Record<string, string> = { "User-Agent": USER_AGENT };
  if (range) reqHeaders.Range = range;

  const cached = confirmParamsCache.get(fileId);
  const validExtra = cached && cached.expiresAt > Date.now() ? cached.params : undefined;

  let res = await fetch(buildDownloadUrl(fileId, validExtra), {
    headers: reqHeaders,
    redirect: "follow",
    cache: "no-store",
  });

  if (res.status === 404) {
    throw new DriveError("File tidak ditemukan di Google Drive. Pastikan link benar dan file belum dihapus.", 404);
  }
  if (res.status === 401 || res.status === 403) {
    throw restrictedError();
  }
  if (res.status === 416) {
    throw new DriveError("Range halaman tidak valid.", 416);
  }
  if (isLoginRedirect(res.url)) {
    throw restrictedError();
  }

  const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
  if (contentType.startsWith("text/html")) {
    const html = (await res.text().catch(() => "")).slice(0, 128_000);
    if (isLoginRedirect(res.url, html)) {
      throw restrictedError();
    }

    const confirmParams = extractConfirmFormParams(html);
    if (!confirmParams) {
      throw new DriveError(
        "Google Drive mengembalikan halaman HTML, bukan file PDF. Pastikan akses file sudah 'Siapa saja yang memiliki link' dan berformat PDF.",
        403
      );
    }

    if (confirmParamsCache.size > 300) confirmParamsCache.clear();
    confirmParamsCache.set(fileId, {
      params: confirmParams,
      expiresAt: Date.now() + CONFIRM_TTL_MS,
    });

    res = await fetch(buildDownloadUrl(fileId, confirmParams), {
      headers: reqHeaders,
      redirect: "follow",
      cache: "no-store",
    });

    if (isLoginRedirect(res.url) || (res.headers.get("content-type") ?? "").toLowerCase().startsWith("text/html")) {
      throw restrictedError();
    }
  }

  if (!res.ok && res.status !== 206) {
    throw new DriveError(`Gagal mengambil file dari Google Drive (HTTP ${res.status}).`, res.status);
  }

  return res;
}

/**
 * Probes only the first 1 KB of a Google Drive file to confirm access, PDF magic header,
 * file size, and original filename in ~200 ms without downloading the entire document.
 */
export async function probeDrivePdf(rawInput: string): Promise<ProbedDrivePdf> {
  const fileId = parseDriveFileId(rawInput);
  const res = await fetchDriveMedia(fileId, "bytes=0-1023");

  const fileSizeBytes = parseTotalBytesFromHeaders(res.headers, res.status);
  const fileName = parseContentDispositionFilename(res.headers.get("content-disposition"));

  // Read up to the first 1024 bytes even if upstream ignored Range and returned 200.
  const reader = res.body?.getReader();
  const chunks: Uint8Array[] = [];
  let totalRead = 0;
  if (reader) {
    try {
      while (totalRead < 1024) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        chunks.push(value);
        totalRead += value.byteLength;
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
  }

  const sample = Buffer.concat(chunks.map((c) => Buffer.from(c))).subarray(0, 1024);
  if (sample.indexOf("%PDF-") === -1) {
    throw new DriveError(
      "File pada link tersebut bukan dokumen PDF yang valid. Pastikan file yang dibagikan berformat .pdf.",
      400
    );
  }

  return {
    fileId,
    fileName,
    fileSizeBytes,
    mimeType: "application/pdf",
  };
}

/**
 * Fetches Google Drive's auto-generated first-page thumbnail on the server so the Drive ID
 * stays hidden from the browser.
 */
export async function fetchDriveThumbnail(fileId: string): Promise<Response> {
  if (!FILE_ID_RE.test(fileId)) {
    throw new DriveError("ID file cover tidak valid.", 400);
  }

  const url = `${THUMBNAIL_URL}?id=${encodeURIComponent(fileId)}&sz=w600`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
    cache: "no-store",
  });

  const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
  if (!res.ok || !contentType.startsWith("image/")) {
    throw new DriveError("Thumbnail cover belum tersedia.", 404);
  }

  return res;
}
