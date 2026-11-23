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
  }> = [
    {
      id: "aff-1",
      referral_code: "BUDI2026",
      status: "active",
      total_clicks: 420,
      total_conversions: 24,
      total_earned: 1850000,
      total_paid_out: 1000000,
      created_at: new Date().toISOString(),
    },
    {
      id: "aff-2",
      referral_code: "RINA99",
      status: "active",
      total_clicks: 185,
      total_conversions: 11,
      total_earned: 790000,
      total_paid_out: 0,
      created_at: new Date().toISOString(),
    },
  ];

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
        <h1 className="text-2xl font-extrabold text-[#0f172a]">Program Affiliate</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Kelola partner affiliate, pantau konversi penjualan referral, dan rekap pencairan komisi.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#e2e8f0] bg-[#f8fafc] text-xs font-semibold text-[#64748b]">
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
            <tbody className="divide-y divide-[#e2e8f0]">
              {affiliates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-xs text-[#64748b]">
                    Belum ada partner affiliate terdaftar.
                  </td>
                </tr>
              ) : (
                affiliates.map((a) => (
                  <tr key={a.id} className="hover:bg-[#f8fafc]">
                    <td className="px-5 py-3.5 font-mono text-xs font-extrabold text-[#059669]">
                      {a.referral_code}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={a.status === "active" ? "success" : "warning"}>
                        {a.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#475569]">{a.total_clicks}</td>
                    <td className="px-5 py-3.5 text-xs font-semibold text-[#0f172a]">
                      {a.total_conversions}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-bold text-[#0f172a]">
                      {formatIDR(a.total_earned)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#475569]">
                      {formatIDR(a.total_paid_out)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#64748b]">
                      {formatDateID(a.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
