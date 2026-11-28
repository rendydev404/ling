import { NextResponse } from "next/server";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { UUID_RE } from "@/lib/ebooks";
import {
  READER_TOKEN_TTL_SECONDS,
  createReaderToken,
  readerCookieName,
  readerCookiePath,
} from "@/lib/reader-token";

export const dynamic = "force-dynamic";

/** Checks the member owns the ebook, then issues a short-lived reading pass cookie. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id) || !isSupabaseServerConfigured()) {
    return NextResponse.json({ error: "Ebook tidak ditemukan." }, { status: 404 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });

  const { data: allowed, error } = await supabase.rpc("can_read_ebook", { p_ebook: id });
  if (error) return NextResponse.json({ error: "Gagal memeriksa akses." }, { status: 500 });
  if (!allowed) return NextResponse.json({ error: "Anda belum memiliki ebook ini." }, { status: 403 });

  const token = createReaderToken(id, user.id);
  if (!token) return NextResponse.json({ error: "Server belum dikonfigurasi." }, { status: 503 });

  const res = NextResponse.json({ ok: true, expiresIn: READER_TOKEN_TTL_SECONDS });
  res.headers.set("Cache-Control", "no-store");
  res.cookies.set(readerCookieName(id), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: readerCookiePath(id),
    maxAge: READER_TOKEN_TTL_SECONDS,
  });
  return res;
}
