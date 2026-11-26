import type { Metadata } from "next";
import { Download, ExternalLink, FileDown, KeyRound } from "lucide-react";
import { Card, EmptyState } from "@/components/ui/controls";
import { requireAuth } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "File & Link Digital · Member Area", robots: { index: false } };

const btn =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border-2 border-[#0f172a] bg-[#22d3ee] px-3.5 text-xs font-extrabold text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#06b6d4]";

export default async function MemberDigitalPage() {
  await requireAuth("/login?next=/member/digital");
  const supabase = await createServerSupabaseClient();
  // RLS returns only assets of products in this member's paid orders.
  const { data } = await supabase
    .from("product_digital_assets")
    .select("id, title, asset_type, external_url, license_key_value, products(title)")
    .order("sort_order", { ascending: true })
    .limit(200);

  const assets = (data ?? []).map((a) => {
    const prod = Array.isArray(a.products) ? a.products[0] : a.products;
    return { ...a, product_title: (prod as { title?: string } | null)?.title ?? "Produk Digital" };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0f172a]">File & Link Digital</h1>
        <p className="mt-1 text-sm font-medium text-[#475569]">
          Unduhan, tautan akses, dan kode lisensi dari produk digital Anda. Ebook dibaca di menu Perpustakaan Ebook.
        </p>
      </div>
      {assets.length === 0 ? (
        <EmptyState
          icon={<FileDown className="h-5 w-5" />}
          title="Belum ada file digital"
          description="File, link, dan lisensi dari produk digital yang Anda beli akan muncul di sini."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {assets.map((a) => (
            <Card key={a.id} className="flex flex-col justify-between gap-4 p-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wide text-[#7e22ce]">{a.product_title}</p>
                <h3 className="mt-1 text-sm font-extrabold text-[#0f172a]">{a.title}</h3>
                {a.license_key_value && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border-2 border-[#0f172a] bg-[#f4f8fb] px-3 py-2 font-mono text-xs font-extrabold text-[#0f172a]">
                    <KeyRound className="h-3.5 w-3.5 shrink-0" />
                    <span className="break-all select-all">{a.license_key_value}</span>
                  </div>
                )}
              </div>
              {a.asset_type === "external_url" && a.external_url ? (
                <a href={a.external_url} target="_blank" rel="noopener noreferrer" className={btn}>
                  Buka Akses <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : a.asset_type === "file" ? (
                <a href={`/api/portal/download/${a.id}`} className={btn}>
                  <Download className="h-3.5 w-3.5" /> Unduh File
                </a>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
