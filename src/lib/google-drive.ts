import crypto from "crypto";

/**
 * Google Drive as private ebook storage, server-side only (REST, no SDK).
 *
 * Files sit in one private folder and are never shared publicly. The browser never
 * sees a Drive id, link or token: uploads are proxied in chunks through
 * /api/admin/ebooks/upload and reading is streamed through /api/reader/[id].
 *
 * Two ways to authenticate (pick one):
 *  A) Personal Gmail: OAuth client + refresh token with the `drive.file` scope, so the
 *     app can only touch files it created itself (run `npm run drive:auth` once).
 *  B) Google Workspace: service account added as a member of a Shared Drive folder.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
export const DRIVE_UPLOAD_PREFIX = `${UPLOAD_API}/files?`;

type DriveMode = "oauth" | "service_account";

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function getDriveFolderId(): string {
  return env("GOOGLE_DRIVE_FOLDER_ID");
}

export function getDriveMode(): DriveMode | null {
  if (env("GOOGLE_OAUTH_CLIENT_ID") && env("GOOGLE_OAUTH_CLIENT_SECRET") && env("GOOGLE_OAUTH_REFRESH_TOKEN")) {
    return "oauth";
  }
  if (env("GOOGLE_SERVICE_ACCOUNT_EMAIL") && env("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")) {
    return "service_account";
  }
  return null;
}

export function isDriveConfigured(): boolean {
  return Boolean(getDriveFolderId() && getDriveMode());
}

export class DriveError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Access token (cached per server instance, refreshed 60s before expiry, de-duplicated)
// ---------------------------------------------------------------------------
let cachedToken: { value: string; expiresAt: number } | null = null;
let inflight: Promise<string> | null = null;

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/** Signed JWT assertion for the service-account flow (exported for tests). */
export function buildServiceAccountAssertion(
  email: string,
  privateKeyPem: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): string {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/drive",
      aud: TOKEN_URL,
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    })
  );
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  return `${header}.${claims}.${base64url(signer.sign(privateKeyPem))}`;
}

async function requestToken(): Promise<string> {
  const mode = getDriveMode();
  let body: URLSearchParams;
  if (mode === "oauth") {
    body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: env("GOOGLE_OAUTH_CLIENT_ID"),
      client_secret: env("GOOGLE_OAUTH_CLIENT_SECRET"),
      refresh_token: env("GOOGLE_OAUTH_REFRESH_TOKEN"),
    });
  } else if (mode === "service_account") {
    // Env files usually carry the PEM with literal "\n".
    const key = env("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY").replace(/\\n/g, "\n");
    body = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: buildServiceAccountAssertion(env("GOOGLE_SERVICE_ACCOUNT_EMAIL"), key),
    });
  } else {
    throw new DriveError("Google Drive belum dikonfigurasi.", 503);
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new DriveError(
      `Gagal login ke Google Drive: ${json.error_description || json.error || res.status}`,
      502
    );
  }
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + Math.max(60, (json.expires_in ?? 3600) - 60) * 1000,
  };
  return json.access_token;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  if (!inflight) {
    inflight = requestToken().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

async function driveFetch(url: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(url, { ...init, headers, cache: "no-store" });
  if (res.status === 401 && retry) {
    cachedToken = null;
    return driveFetch(url, init, false);
  }
  return res;
}

async function driveError(res: Response, fallback: string): Promise<DriveError> {
  const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  return new DriveError(`${fallback}: ${json?.error?.message ?? res.statusText}`, res.status);
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------
export interface DriveFileMeta {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  parents: string[];
  trashed: boolean;
}

export async function getDriveFileMeta(fileId: string): Promise<DriveFileMeta> {
  const res = await driveFetch(
    `${API}/files/${encodeURIComponent(fileId)}?supportsAllDrives=true&fields=id,name,mimeType,size,parents,trashed`
  );
  if (!res.ok) throw await driveError(res, "File Drive tidak ditemukan");
  const json = (await res.json()) as Omit<DriveFileMeta, "size"> & { size?: string };
  return {
    id: json.id,
    name: json.name,
    mimeType: json.mimeType,
    size: json.size ? Number(json.size) : null,
    parents: json.parents ?? [],
    trashed: Boolean(json.trashed),
  };
}

/** Confirms a freshly uploaded file landed in our private folder with the expected type. */
export async function assertUploadedFile(
  fileId: string,
  allowedMime: (mime: string) => boolean
): Promise<DriveFileMeta> {
  const meta = await getDriveFileMeta(fileId);
  if (meta.trashed || !meta.parents.includes(getDriveFolderId())) {
    throw new DriveError("File tidak berada di folder ebook.", 400);
  }
  if (!allowedMime(meta.mimeType)) {
    throw new DriveError(`Tipe file tidak didukung (${meta.mimeType}).`, 400);
  }
  return meta;
}

/** Starts a resumable upload session; the session URL stays with the admin uploader. */
export async function createResumableUpload(params: {
  name: string;
  mimeType: string;
  size: number;
}): Promise<string> {
  const res = await driveFetch(
    `${UPLOAD_API}/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,mimeType,size`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": params.mimeType,
        "X-Upload-Content-Length": String(params.size),
      },
      body: JSON.stringify({
        name: params.name,
        mimeType: params.mimeType,
        parents: [getDriveFolderId()],
        appProperties: { source: "ling-ebook" },
      }),
    }
  );
  const location = res.headers.get("location");
  if (!res.ok || !location) throw await driveError(res, "Gagal memulai upload ke Drive");
  return location;
}

export function isDriveUploadSessionUrl(url: string): boolean {
  return url.startsWith(DRIVE_UPLOAD_PREFIX) && /[?&]upload_id=/.test(url);
}

/**
 * Sends one chunk of a resumable upload.
 * Returns the received byte count while incomplete, or the file id when finished.
 */
export async function uploadChunk(
  sessionUrl: string,
  chunk: ArrayBuffer,
  contentRange: string
): Promise<{ done: false; received: number } | { done: true; fileId: string }> {
  if (!isDriveUploadSessionUrl(sessionUrl)) {
    throw new DriveError("Sesi upload tidak valid.", 400);
  }
  // The session URL itself authorizes the upload; no bearer token needed.
  const res = await fetch(sessionUrl, {
    method: "PUT",
    headers: {
      "Content-Length": String(chunk.byteLength),
      "Content-Range": contentRange,
    },
    body: chunk,
    cache: "no-store",
  });
  if (res.status === 308) {
    const range = res.headers.get("range"); // "bytes=0-1234"
    const received = range ? Number(range.split("-")[1]) + 1 : 0;
    return { done: false, received };
  }
  if (res.ok) {
    const json = (await res.json()) as { id?: string };
    if (!json.id) throw new DriveError("Drive tidak mengembalikan id file.", 502);
    return { done: true, fileId: json.id };
  }
  throw await driveError(res, "Upload chunk gagal");
}

/** Streams file bytes from Drive, forwarding an optional HTTP Range header. */
export async function fetchDriveMedia(fileId: string, range?: string | null): Promise<Response> {
  const headers: Record<string, string> = {};
  if (range) headers.Range = range;
  const res = await driveFetch(
    `${API}/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    { headers }
  );
  if (!res.ok && res.status !== 206) throw await driveError(res, "Gagal membaca file dari Drive");
  return res;
}

/** Deletes a file permanently; falls back to trash when delete is not permitted. */
export async function deleteDriveFile(fileId: string): Promise<void> {
  const url = `${API}/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`;
  const res = await driveFetch(url, { method: "DELETE" });
  if (res.ok || res.status === 404) return;
  if (res.status === 403) {
    const trash = await driveFetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trashed: true }),
    });
    if (trash.ok) return;
  }
  throw await driveError(res, "Gagal menghapus file Drive");
}
