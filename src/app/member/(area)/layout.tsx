import { redirect } from "next/navigation";
import { MemberShell } from "@/components/member/member-shell";
import { isPrimaryAdminEmail, requireAuth } from "@/lib/supabase/auth";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getStoreSettings } from "@/lib/storefront-data";

export const dynamic = "force-dynamic";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseServerConfigured()) redirect("/login?next=/member");

  const [{ user, profile }, { settings }] = await Promise.all([
    requireAuth("/login?next=/member"),
    getStoreSettings(),
  ]);

  return (
    <MemberShell
      brandName={settings.brand_name}
      memberName={profile?.full_name ?? ""}
      memberEmail={user.email}
      isAdmin={profile?.role === "admin" || isPrimaryAdminEmail(user.email)}
    >
      {children}
    </MemberShell>
  );
}
