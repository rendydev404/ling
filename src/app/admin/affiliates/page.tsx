import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { Badge, Card } from "@/components/ui/controls";
import { formatDateID, formatIDR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminAffiliatesPage() {
  let affiliates: Array<{
    id: string;
    referral_code: string;
    status: string;
    total_clicks: number;
    total_conversions: number;
    total_earned: number;
    total_paid_out: number;
    created_at: string;
  }> = [];

  if (isSupabaseServerConfigured()) {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("affiliates")
      .select(
        "id, referral_code, status, total_clicks, total_conversions, total_earned, total_paid_out, created_at"
      )
      .order("total_earned", { ascending: false })
      .limit(100);
    affiliates = (data ?? []).map((a) => ({
      ...a,
      total_earned: Number(a.total_earned),
      total_paid_out: Number(a.total_paid_out),
    }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-[#0f172a]">Program Affiliate</h1>
        <p className="mt-1 text-xs sm:text-sm font-medium text-[#475569]">
          Kelola partner affiliate, pantau konversi penjualan referral, dan rekap pencairan komisi.
        </p>
      </div>

      <Card className="overflow-hidden">
        {affiliates.length === 0 ? (
          <div className="px-5 py-12 text-center text-xs font-semibold text-[#475569]">
            Belum ada partner affiliate terdaftar.
          </div>
        ) : (
          <>
            {/* Mobile Affiliate Cards */}
            <div className="divide-y-2 divide-[#0f172a] md:hidden">
              {affiliates.map((a) => (
                <div key={a.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md border-2 border-[#0f172a] bg-[#67e8f9] px-2.5 py-0.5 font-mono text-xs font-black text-[#0f172a] shadow-[2px_2px_0px_#0f172a]">
                      {a.referral_code}
                    </span>
                    <Badge variant={a.status === "active" ? "success" : "warning"}>
                      {a.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-[#0f172a]/20 bg-[#f8fafc] p-2">
                      <p className="text-[10px] font-bold uppercase text-[#64748b]">Komisi</p>
                      <p className="font-black text-[#7e22ce]">{formatIDR(a.total_earned)}</p>
                    </div>
                    <div className="rounded-lg border border-[#0f172a]/20 bg-[#f8fafc] p-2">
                      <p className="text-[10px] font-bold uppercase text-[#64748b]">Klik / Konversi</p>
                      <p className="font-black text-[#0f172a]">
                        {a.total_clicks} klik · {a.total_conversions} order
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] font-medium text-[#64748b]">
                    Cair: {formatIDR(a.total_paid_out)} · Gabung {formatDateID(a.created_at)}
                  </p>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b-2 border-[#0f172a] bg-[#f3e8ff] text-xs font-extrabold uppercase tracking-wider text-[#0f172a]">
                  <tr>
                    <th className="px-5 py-3">Kode Referral</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Klik</th>
                    <th className="px-5 py-3">Konversi</th>
                    <th className="px-5 py-3">Total Komisi</th>
                    <th className="px-5 py-3">Sudah Dibayar</th>
                    <th className="px-5 py-3">Bergabung</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-[#0f172a]/15">
                  {affiliates.map((a) => (
                    <tr key={a.id} className="hover:bg-[#ecfeff]/50">
                      <td className="px-5 py-3.5 font-mono text-xs font-extrabold text-[#0f172a]">
                        <span className="rounded-md border-2 border-[#0f172a] bg-[#67e8f9] px-2 py-0.5 shadow-[2px_2px_0px_#0f172a]">
                          {a.referral_code}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={a.status === "active" ? "success" : "warning"}>
                          {a.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-[#334155]">
                        {a.total_clicks}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-extrabold text-[#0f172a]">
                        {a.total_conversions}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-extrabold text-[#7e22ce]">
                        {formatIDR(a.total_earned)}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-[#334155]">
                        {formatIDR(a.total_paid_out)}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium text-[#475569]">
                        {formatDateID(a.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
