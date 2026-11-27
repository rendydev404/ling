import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const AUTH_REQUIRED_PREFIXES = [
  "/admin",
  "/portal",
  "/member",
  "/affiliate",
  "/api/admin",
  "/api/portal",
  "/api/member",
  "/api/affiliate",
];

/** Refresh access token in proxy only when expiring within 2 minutes. */
const REFRESH_BUFFER_SECONDS = 120;

function needsAuthRefresh(pathname: string): boolean {
  return AUTH_REQUIRED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function decodeBase64Url(input: string): string | null {
  try {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (normalized.length % 4)) % 4;
    return atob(normalized + "=".repeat(padLen));
  } catch {
    return null;
  }
}

/**
 * Reads the expiry timestamp from Supabase SSR auth cookies (`sb-*-auth-token` / `.0`, `.1`)
 * solely to decide whether `proxy` must perform a token-refresh round-trip before rendering.
 * Actual authorization ALWAYS runs server-side via `supabase.auth.getUser()` in layouts/APIs.
 */
function isSupabaseCookieFresh(request: NextRequest): boolean {
  const allCookies = request.cookies.getAll();
  const authCookies = allCookies.filter(
    (c) =>
      c.name.startsWith("sb-") &&
      c.name.includes("-auth-token") &&
      !c.name.includes("-code-verifier")
  );

  if (authCookies.length === 0) return false;

  // Reassemble chunked cookies (.0, .1, ...) or single cookie
  const baseCookie = authCookies.find((c) => !/\.\d+$/.test(c.name));
  let rawValue = baseCookie?.value ?? "";
  if (!rawValue) {
    const chunks = authCookies
      .filter((c) => /\.\d+$/.test(c.name))
      .sort((a, b) => {
        const idxA = Number(a.name.split(".").pop() ?? 0);
        const idxB = Number(b.name.split(".").pop() ?? 0);
        return idxA - idxB;
      });
    rawValue = chunks.map((c) => c.value).join("");
  }

  if (!rawValue) return false;

  const jsonStr = rawValue.startsWith("base64-")
    ? decodeBase64Url(rawValue.slice("base64-".length))
    : rawValue;
  if (!jsonStr) return false;

  try {
    const session = JSON.parse(jsonStr) as {
      expires_at?: number;
      access_token?: string;
    };
    const nowSec = Math.floor(Date.now() / 1000);

    if (typeof session.expires_at === "number") {
      return session.expires_at - nowSec > REFRESH_BUFFER_SECONDS;
    }

    if (typeof session.access_token === "string") {
      const parts = session.access_token.split(".");
      if (parts.length === 3) {
        const payloadJson = decodeBase64Url(parts[1]);
        if (payloadJson) {
          const payload = JSON.parse(payloadJson) as { exp?: number };
          if (typeof payload.exp === "number") {
            return payload.exp - nowSec > REFRESH_BUFFER_SECONDS;
          }
        }
      }
    }
  } catch {
    return false;
  }

  return false;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Capture ?ref=CODE affiliate parameter and persist 30-day last-click cookie
  const refCode = request.nextUrl.searchParams.get("ref");
  if (refCode && /^[a-zA-Z0-9_-]{3,32}$/.test(refCode)) {
    response.cookies.set("ling_ref", refCode.toUpperCase(), {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
    });
  }

  // Fast-path: public routes never need auth token refresh
  if (!needsAuthRefresh(request.nextUrl.pathname)) {
    return response;
  }

  const hasSupabaseCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

  if (!hasSupabaseCookie) {
    return response;
  }

  // Zero-latency fast-path: skip redundant network call when access token is still fresh;
  // Server Components & API routes still verify the user via supabase.auth.getUser().
  if (isSupabaseCookieFresh(request)) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("your-project-ref")) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|logo.svg|logo.png|payment-logos/|pdfjs/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|wasm|bcmap|pfb|ttf|icc)$).*)",
  ],
};
