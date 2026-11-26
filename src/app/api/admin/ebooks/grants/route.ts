import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdminApi } from "@/lib/supabase/auth";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { GRANT_COLS } from "@/lib/ebooks";

export const dynamic = "force-dynamic";

const grantSchema = z
  .object({
    emails: z.array(z.string().trim().toLowerCase().email()).min(1).max(200),
    all: z.boolean().default(false),
    ebook_ids: z.array(z.string().uuid()).max(500).default([]),
    expires_at: z.string().datetime({ offset: true }).nullable().optional(),
    note: z.string().trim().max(300).nullable().optional(),
  })
  .refine((v) => v.all || v.ebook_ids.length > 0, { message: "Pilih minimal satu ebook." });

/** Gives free reading access to one or more emails: selected ebooks, or all ebooks. */
export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 503 });
  }
  const auth = await assertAdminApi();
  if ("error" in auth) return auth.error;

  const parsed = grantSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data akses tidak valid." },
      { status: 400 }
    );
  }
  const emails = [...new Set(parsed.data.emails)];
  const { all, note } = parsed.data;
  const ebookIds = [...new Set(parsed.data.ebook_ids)];
  const expiresAt = parsed.data.expires_at ?? null;
  const db = auth.supabase;

  // Link to existing accounts right away (emails without an account match once they register).
  const { data: profiles } = await db.from("profiles").select("id, email").in("email", emails);
  const userIdByEmail = new Map((profiles ?? []).map((p) => [String(p.email).toLowerCase(), p.id as string]));

  // Partial unique indexes can't be targeted by an upsert, so replace the overlapping rows.
  const del = db.from("ebook_grants").delete().in("email", emails);
  const { error: delError } = all ? await del : await del.in("ebook_id", ebookIds);
  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });

  const rows = emails.flatMap((email) =>
    (all ? [null] : ebookIds).map((ebook_id) => ({
      email,
      ebook_id,
      user_id: userIdByEmail.get(email) ?? null,
      note: note || null,
      expires_at: expiresAt,
      granted_by: auth.user.id,
    }))
  );
  const { data, error } = await db.from("ebook_grants").insert(rows).select(GRANT_COLS);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { grants: data, linkedAccounts: userIdByEmail.size, totalEmails: emails.length },
    { status: 201 }
  );
}

/** Revokes one grant (?id=) or every grant of an email (?email=). */
export async function DELETE(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 503 });
  }
  const auth = await assertAdminApi();
  if ("error" in auth) return auth.error;

  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  const email = params.get("email")?.trim().toLowerCase();

  let query = auth.supabase.from("ebook_grants").delete();
  if (id && z.string().uuid().safeParse(id).success) query = query.eq("id", id);
  else if (email && z.string().email().safeParse(email).success) query = query.eq("email", email);
  else return NextResponse.json({ error: "Parameter tidak valid." }, { status: 400 });

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
