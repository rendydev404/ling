#!/usr/bin/env node
/**
 * One-time Google Drive setup for ebook storage (personal Gmail / OAuth mode).
 *
 *   npm run drive:auth            -> opens Google login, prints GOOGLE_OAUTH_REFRESH_TOKEN
 *                                    and creates a private "Ling Ebooks (Private)" folder
 *   npm run drive:auth -- --check -> verifies the credentials in .env.local can reach the folder
 *
 * Needs GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET (OAuth client of type
 * "Desktop app") in .env.local or the environment. Scope is drive.file: the app can only
 * see files it created itself, never the rest of your Drive.
 */
import http from "node:http";
import crypto from "node:crypto";
import { exec } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SCOPE = "https://www.googleapis.com/auth/drive.file";
const FOLDER_NAME = "Ling Ebooks (Private)";

function loadEnvLocal() {
  const file = join(process.cwd(), ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function tokenRequest(params) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${json.error}: ${json.error_description ?? ""}`);
  return json;
}

async function drive(path, token, init = {}) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? res.statusText);
  return json;
}

function openBrowser(url) {
  const cmd =
    process.platform === "win32" ? `start "" "${url}"` : process.platform === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

async function check(clientId, clientSecret) {
  const refresh = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!refresh || !folderId) throw new Error("Isi GOOGLE_OAUTH_REFRESH_TOKEN dan GOOGLE_DRIVE_FOLDER_ID di .env.local dulu.");
  const { access_token } = await tokenRequest({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refresh,
  });
  const folder = await drive(`files/${folderId}?fields=id,name,trashed`, access_token);
  if (folder.trashed) throw new Error("Folder ebook ada di Sampah Google Drive.");
  const list = await drive(
    `files?q=${encodeURIComponent(`'${folderId}' in parents and trashed = false`)}&fields=files(id)&pageSize=1000`,
    access_token
  );
  console.log(`\n✅ Tersambung. Folder "${folder.name}" berisi ${list.files.length} file dari aplikasi ini.\n`);
}

async function main() {
  loadEnvLocal();
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error(
      "\nIsi GOOGLE_OAUTH_CLIENT_ID dan GOOGLE_OAUTH_CLIENT_SECRET di .env.local dulu\n" +
        "(Google Cloud Console > APIs & Services > Credentials > OAuth client ID > Desktop app).\n"
    );
    process.exit(1);
  }

  if (process.argv.includes("--check")) {
    await check(clientId, clientSecret);
    return;
  }

  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const state = crypto.randomBytes(16).toString("hex");

  const server = http.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const redirectUri = `http://127.0.0.1:${server.address().port}/callback`;

  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPE,
      access_type: "offline",
      prompt: "consent",
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });

  console.log("\nMembuka browser untuk login Google. Jika tidak terbuka, salin link ini:\n\n" + authUrl + "\n");
  openBrowser(authUrl);

  const code = await new Promise((resolve, reject) => {
    server.on("request", (req, res) => {
      const url = new URL(req.url, redirectUri);
      if (url.pathname !== "/callback") return res.end();
      const ok = url.searchParams.get("state") === state && url.searchParams.get("code");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        ok
          ? "<h2>Berhasil. Kembali ke terminal, jendela ini boleh ditutup.</h2>"
          : `<h2>Gagal: ${url.searchParams.get("error") ?? "state tidak cocok"}</h2>`
      );
      server.close();
      if (ok) resolve(url.searchParams.get("code"));
      else reject(new Error(url.searchParams.get("error") ?? "state mismatch"));
    });
  });

  const tokens = await tokenRequest({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });
  if (!tokens.refresh_token) {
    throw new Error("Google tidak mengirim refresh token. Cabut akses aplikasi di myaccount.google.com/permissions lalu ulangi.");
  }

  let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    const folder = await drive("files?fields=id,name", tokens.access_token, {
      method: "POST",
      body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
    });
    folderId = folder.id;
    console.log(`📁 Folder privat "${FOLDER_NAME}" dibuat di Google Drive Anda.`);
  }

  console.log("\nTambahkan ke .env.local DAN ke Environment Variables hosting (Vercel), lalu deploy ulang:\n");
  console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log(`GOOGLE_DRIVE_FOLDER_ID=${folderId}`);
  console.log("\nJangan bagikan refresh token ini ke siapa pun.\n");
}

main().catch((err) => {
  console.error("\n❌", err.message, "\n");
  process.exit(1);
});
