import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertAdminApi } from "@/lib/supabase/auth";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { DriveError, assertUploadedFile, deleteDriveFile, isDriveConfigured } from "@/lib/google-drive";
import { ADMIN_EBOOK_COLS, isCoverMime, isEbookMime } from "@/lib/ebooks";
import { forgetEbookFiles } from "@/lib/ebook-files";

export const dynamic = "force-dynamic";

const baseSchema = z.object({
  title: z.string().trim().min(2).max(200),
  author: z.string().trim().max(160).nullable().optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  status: z.enum(["draft", "published"]).default("published"),
  product_ids: z.array(z.string().uuid()).max(50).default([]),
  cover_drive_file_id: z.string().min(10).max(200).nullable().optional(),
});

const createSchema = baseSchema.extend({
  drive_file_id: z.string().min(10).max(200),
  page_count: z.number().int().positive().max(100000).nullable().optional(),
});

const updateSchema = baseSchema.extend({ id: z.string().uuid() });

function fail(err: unknown, fallback: string) {
  if (err instanceof DriveError) {
    return NextResponse.json({ error: err.message }, { status: err.status >= 400 ? err.status : 502 });
  }
  console.error("[admin-ebooks]", err);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

async function replaceProductLinks(
  supabase: SupabaseClient,
  ebookId: string,
  productIds: string[]
) {
  await supabase.from("product_ebooks").delete().eq("ebook_id", ebookId);
  if (productIds.length) {
    const { error } = await supabase
      .from("product_ebooks")
      .insert(productIds.map((product_id, i) => ({ product_id, ebook_id: ebookId, sort_order: i })));
    if (error) throw new Error(error.message);
  }
}

/** Registers an uploaded PDF (and optional cover) as an ebook. */
export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 503 });
  }
  const auth = await assertAdminApi();
  if ("error" in auth) return auth.error;
  if (!isDriveConfigured()) {
    return NextResponse.json({ error: "Google Drive belum dikonfigurasi di server." }, { status: 503 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data ebook tidak valid." }, { status: 400 });
  const input = parsed.data;

  try {
    const [file] = await Promise.all([
      assertUploadedFile(input.drive_file_id, isEbookMime),
      input.cover_drive_file_id ? assertUploadedFile(input.cover_drive_file_id, isCoverMime) : null,
    ]);

    const { data: ebook, error } = await auth.supabase
      .from("ebooks")
      .insert({
        title: input.title,
        author: input.author || null,
        description: input.description || null,
        status: input.status,
        drive_file_id: input.drive_file_id,
        cover_drive_file_id: input.cover_drive_file_id ?? null,
        mime_type: file.mimeType,
        file_size_bytes: file.size,
        page_count: input.page_count ?? null,
      })
      .select("id")
      .single();
    if (error || !ebook) throw new Error(error?.message ?? "Insert gagal");

    await replaceProductLinks(auth.supabase, ebook.id, input.product_ids);

    const { data: row } = await auth.supabase
      .from("ebooks")
      .select(ADMIN_EBOOK_COLS)
      .eq("id", ebook.id)
      .single();
    return NextResponse.json({ ebook: row }, { status: 201 });
  } catch (err) {
    return fail(err, "Gagal menyimpan ebook.");
  }
}

export async function PUT(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 503 });
  }
  const auth = await assertAdminApi();
  if ("error" in auth) return auth.error;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data ebook tidak valid." }, { status: 400 });
  const input = parsed.data;

  try {
    const { data: current } = await auth.supabase
      .from("ebooks")
      .select("cover_drive_file_id")
      .eq("id", input.id)
      .maybeSingle();
    if (!current) return NextResponse.json({ error: "Ebook tidak ditemukan." }, { status: 404 });

    const coverChanged =
      input.cover_drive_file_id !== undefined && input.cover_drive_file_id !== current.cover_drive_file_id;
    if (coverChanged && input.cover_drive_file_id) {
      await assertUploadedFile(input.cover_drive_file_id, isCoverMime);
    }

    const { error } = await auth.supabase
      .from("ebooks")
      .update({
        title: input.title,
        author: input.author || null,
        description: input.description || null,
        status: input.status,
        ...(coverChanged ? { cover_drive_file_id: input.cover_drive_file_id } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id);
    if (error) throw new Error(error.message);

    await replaceProductLinks(auth.supabase, input.id, input.product_ids);
    forgetEbookFiles(input.id);

    if (coverChanged && current.cover_drive_file_id) {
      await deleteDriveFile(current.cover_drive_file_id).catch((e) => console.warn("[admin-ebooks] old cover", e));
    }

    const { data: row } = await auth.supabase
      .from("ebooks")
      .select(ADMIN_EBOOK_COLS)
      .eq("id", input.id)
      .single();
    return NextResponse.json({ ebook: row });
  } catch (err) {
    return fail(err, "Gagal memperbarui ebook.");
  }
}

export async function DELETE(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 503 });
  }
  const auth = await assertAdminApi();
  if ("error" in auth) return auth.error;

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Id ebook tidak valid." }, { status: 400 });
  }

  const { data: ebook } = await auth.supabase
    .from("ebooks")
    .select("drive_file_id, cover_drive_file_id")
    .eq("id", id)
    .maybeSingle();
  if (!ebook) return NextResponse.json({ ok: true });

  const { error } = await auth.supabase.from("ebooks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  forgetEbookFiles(id);

  // Database row is gone, so access is already revoked; Drive cleanup is best effort.
  const fileIds = [ebook.drive_file_id, ebook.cover_drive_file_id].filter(Boolean) as string[];
  const results = await Promise.allSettled(fileIds.map((f) => deleteDriveFile(f)));
  const driveCleanupFailed = results.some((r) => r.status === "rejected");
  return NextResponse.json({ ok: true, driveCleanupFailed });
}
