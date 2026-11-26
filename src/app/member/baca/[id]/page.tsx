import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/supabase/auth";
import { createServerSupabaseClient, createServiceRoleClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { UUID_RE } from "@/lib/ebooks";
import { EbookReader } from "@/components/member/ebook-reader";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Baca Ebook · Member Area", robots: { index: false, follow: false } };

export default async function ReadEbookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  if (!isSupabaseServerConfigured()) redirect("/login?next=/member/ebooks");

  const { user } = await requireAuth(`/login?next=/member/baca/${id}`);
  const supabase = await createServerSupabaseClient();
  const service = createServiceRoleClient();

  const [allowedRes, ebookRes, progressRes] = await Promise.all([
    supabase.rpc("can_read_ebook", { p_ebook: id }),
    // Ebook rows are admin-only under RLS; metadata is read with the service role and
    // only shown after the entitlement check below passes.
    (service ?? supabase).from("ebooks").select("id, title, author, page_count").eq("id", id).maybeSingle(),
    supabase
      .from("ebook_reading_progress")
      .select("last_page, bookmarks")
      .eq("user_id", user.id)
      .eq("ebook_id", id)
      .maybeSingle(),
  ]);

  if (!ebookRes.data) notFound();
  if (!allowedRes.data) redirect("/member/ebooks?terkunci=1");

  return (
    <EbookReader
      ebookId={id}
      title={ebookRes.data.title}
      author={ebookRes.data.author}
      watermark={user.email}
      initialPage={progressRes.data?.last_page ?? 1}
      initialBookmarks={progressRes.data?.bookmarks ?? []}
      fileUrl={`/api/reader/${id}`}
      sessionUrl={`/api/member/ebooks/${id}/session`}
      progressUrl={`/api/member/ebooks/${id}/progress`}
    />
  );
}
