import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient, createServiceRoleClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { UUID_RE } from "@/lib/ebooks";

export const dynamic = "force-dynamic";

const schema = z.object({
  page: z.number().int().min(1).max(100000),
  total: z.number().int().min(1).max(100000).nullable().optional(),
  bookmarks: z.array(z.number().int().min(1).max(100000)).max(500).optional(),
});

/** Saves last page / bookmarks. Accepts fetch JSON and navigator.sendBeacon payloads. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id) || !isSupabaseServerConfigured()) {
    return NextResponse.json({ error: "Ebook tidak ditemukan." }, { status: 404 });
  }

  const parsed = schema.safeParse(JSON.parse((await request.text().catch(() => "")) || "null"));
  if (!parsed.success) return NextResponse.json({ error: "Data progres tidak valid." }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });

  const { page, total, bookmarks } = parsed.data;
  // RLS limits writes to the caller's own row.
  const { error } = await supabase.from("ebook_reading_progress").upsert(
    {
      user_id: user.id,
      ebook_id: id,
      last_page: total ? Math.min(page, total) : page,
      total_pages: total ?? null,
      ...(bookmarks ? { bookmarks: [...new Set(bookmarks)].sort((a, b) => a - b) } : {}),
      last_read_at: new Date().toISOString(),
    },
    { onConflict: "user_id,ebook_id" }
  );
  if (error) return NextResponse.json({ error: "Gagal menyimpan progres." }, { status: 500 });

  // Auto-populate ebooks.page_count on first open if it was not filled manually.
  if (total && total > 0) {
    const service = createServiceRoleClient();
    if (service) {
      await service
        .from("ebooks")
        .update({ page_count: total })
        .eq("id", id)
        .is("page_count", null);
    }
  }

  return NextResponse.json({ ok: true });
}
