import type { Metadata } from "next";
import { requireAuth } from "@/lib/supabase/auth";
import { formatDateID } from "@/lib/utils";
import { AccountClient } from "@/components/member/account-client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Akun Saya · Member Area", robots: { index: false } };

export default async function MemberAccountPage() {
  const { user, profile } = await requireAuth("/login?next=/member/akun");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0f172a]">Akun Saya</h1>
        <p className="mt-1 text-sm font-medium text-[#475569]">Kelola data diri dan keamanan akun.</p>
      </div>
      <AccountClient
        email={user.email}
        fullName={profile?.full_name ?? ""}
        phone={profile?.phone ?? ""}
        memberSince={profile?.created_at ? formatDateID(profile.created_at) : "-"}
      />
    </div>
  );
}
