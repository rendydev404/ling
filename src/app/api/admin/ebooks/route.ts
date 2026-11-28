import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertAdminApi } from "@/lib/supabase/auth";
import { createServiceRoleClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { DriveError, parseDriveFileId, probeDrivePdf } from "@/lib/google-drive";
import { ADMIN_EBOOK_COLS } from "@/lib/ebooks";
import { forgetEbookFiles } from "@/lib/ebook-files";

export const dynamic = "force-dynamic";

const COVER_BUCKET = "public-media";
const DRIVE_THUMB_PREFIX = "drive-thumb:";

const baseSchema = z.object({
  title: z.string().trim().min(2).max(200),
  author: z.string().trim().max(160).nullable().optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  status: z.enum(["draft", "published"]).default("published"),
  product_ids: z.array(z.string().uuid()).max(50).default([]),
  page_count: z.number().int().positive().max(100000).nullable().optional(),
  cover_url: z.string().trim().max(600).nullable().optional(),
});

const createSchema = baseSchema.extend({
  drive_url: z.string().trim().min(5).max(1000),
});

const updateSchema = baseSchema.extend({
  id: z.string().uuid(),
  drive_url: z.string().trim().min(5).max(1000).optional(),
});

function extractSupabasePublicObjectPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("http")) return null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  if (!supabaseUrl || !value.startsWith(supabaseUrl)) return null;
  const marker = `/storage/v1/object/public/${COVER_BUCKET}/`;
  const idx = value.indexOf(marker);
  if (idx === -1) return null;
  const path = value.slice(idx + marker.length).split("?")[0];
  return path || null;
}

async function cleanupSupabaseCover(coverValue: string | null | undefined) {
  const objectPath = extractSupabasePublicObjectPath(coverValue);
  if (!objectPath) return;
  const service = createServiceRoleClient();
  if (!service) return;
  await service.storage.from(COVER_BUCKET).remove([objectPath]).catch((e) => {
    console.warn("[admin-ebooks] cover cleanup", e);
  });
}

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

/** Registers an ebook backed by a Google Drive PDF link. */
export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 503 });
  }
  const auth = await assertAdminApi();
  if ("error" in auth) return auth.error;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data ebook tidak valid." }, { status: 400 });
  const input = parsed.data;

  if (input.cover_url && !extractSupabasePublicObjectPath(input.cover_url)) {
    return NextResponse.json({ error: "URL cover tidak valid." }, { status: 400 });
  }

  try {
    const file = await probeDrivePdf(input.drive_url);
    const coverReference = input.cover_url || `${DRIVE_THUMB_PREFIX}${file.fileId}`;

    const { data: ebook, error } = await auth.supabase
      .from("ebooks")
      .insert({
        title: input.title,
        author: input.author || null,
        description: input.description || null,
        status: input.status,
        drive_file_id: file.fileId,
        cover_drive_file_id: coverReference,
        mime_type: file.mimeType,
        file_size_bytes: file.fileSizeBytes,
        page_count: input.page_count ?? null,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "File PDF Google Drive ini sudah terdaftar di daftar ebook Anda." },
          { status: 409 }
        );
      }
      throw new Error(error.message);
    }
    if (!ebook) throw new Error("Insert gagal");

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

  if (input.cover_url && !extractSupabasePublicObjectPath(input.cover_url)) {
    return NextResponse.json({ error: "URL cover tidak valid." }, { status: 400 });
  }

  try {
    const { data: current } = await auth.supabase
      .from("ebooks")
      .select("drive_file_id, cover_drive_file_id")
      .eq("id", input.id)
      .maybeSingle();
    if (!current) return NextResponse.json({ error: "Ebook tidak ditemukan." }, { status: 404 });

    let nextDriveFileId = current.drive_file_id;
    let nextSizeUpdate: { file_size_bytes?: number | null } = {};

    if (input.drive_url) {
      const candidateId = parseDriveFileId(input.drive_url);
      if (candidateId !== current.drive_file_id) {
        const probed = await probeDrivePdf(input.drive_url);
        nextDriveFileId = probed.fileId;
        nextSizeUpdate = { file_size_bytes: probed.fileSizeBytes };
      }
    }

    let nextCover = current.cover_drive_file_id;
    let coverChanged = false;
    if (input.cover_url !== undefined) {
      const resolvedCover = input.cover_url || `${DRIVE_THUMB_PREFIX}${nextDriveFileId}`;
      if (resolvedCover !== current.cover_drive_file_id) {
        nextCover = resolvedCover;
        coverChanged = true;
      }
    } else if (
      nextDriveFileId !== current.drive_file_id &&
      (!current.cover_drive_file_id || current.cover_drive_file_id.startsWith(DRIVE_THUMB_PREFIX))
    ) {
      nextCover = `${DRIVE_THUMB_PREFIX}${nextDriveFileId}`;
      coverChanged = true;
    }

    const { error } = await auth.supabase
      .from("ebooks")
      .update({
        title: input.title,
        author: input.author || null,
        description: input.description || null,
        status: input.status,
        drive_file_id: nextDriveFileId,
        ...nextSizeUpdate,
        ...(input.page_count !== undefined ? { page_count: input.page_count } : {}),
        ...(coverChanged ? { cover_drive_file_id: nextCover } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id);

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Link PDF Google Drive tersebut sudah dipakai oleh ebook lain." },
          { status: 409 }
        );
      }
      throw new Error(error.message);
    }

    await replaceProductLinks(auth.supabase, input.id, input.product_ids);
    forgetEbookFiles(input.id);

    if (coverChanged && current.cover_drive_file_id) {
      await cleanupSupabaseCover(current.cover_drive_file_id);
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
    .select("cover_drive_file_id")
    .eq("id", id)
    .maybeSingle();
  if (!ebook) return NextResponse.json({ ok: true });

  const { error } = await auth.supabase.from("ebooks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  forgetEbookFiles(id);

  await cleanupSupabaseCover(ebook.cover_drive_file_id);
  return NextResponse.json({ ok: true });
}
