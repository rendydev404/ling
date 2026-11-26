import type { Metadata } from "next";
import { CheckCircle2, Crown, ExternalLink } from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ui/controls";
import { requireAuth } from "@/lib/supabase/auth";
import { getMemberMemberships } from "@/lib/member-data";
import { formatDateID } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Membership · Member Area", robots: { index: false } };

export default async function MemberMembershipPage() {
  const { user } = await requireAuth("/login?next=/member/membership");
  const memberships = await getMemberMemberships(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0f172a]">Membership</h1>
        <p className="mt-1 text-sm font-medium text-[#475569]">
          Status langganan dan akses komunitas eksklusif. Ebook dari membership terbuka selama langganan aktif.
        </p>
      </div>

      {memberships.length === 0 ? (
        <EmptyState
          icon={<Crown className="h-5 w-5" />}
          title="Belum ada membership"
          description="Gabung membership untuk membuka konten, ebook, dan grup privat."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {memberships.map((m) => {
            const active = m.status === "active";
            return (
              <Card key={m.id} className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  {active ? (
                    <Badge variant="success">
                      <CheckCircle2 className="h-3 w-3" /> Aktif
                    </Badge>
                  ) : (
                    <Badge variant="danger">{m.status === "cancelled" ? "Dibatalkan" : "Berakhir"}</Badge>
                  )}
                  <span className="text-xs font-semibold text-[#475569]">
                    {active ? "Berakhir" : "Berakhir pada"}: {formatDateID(m.expires_at)}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-[#0f172a]">{m.product_title}</h3>
                {active && m.community_link && (
                  <a
                    href={m.community_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border-2 border-[#0f172a] bg-[#22d3ee] px-3.5 text-xs font-extrabold text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#06b6d4]"
                  >
                    Masuk Grup Privat <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
