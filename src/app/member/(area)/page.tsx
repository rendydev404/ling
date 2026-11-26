import type { Metadata } from "next";
import { requireAuth } from "@/lib/supabase/auth";
import { getMemberCourses, getMemberLibrary, getMemberMemberships, getMemberOrders, getMemberSchedule } from "@/lib/member-data";
import { MemberDashboardView } from "@/components/member/dashboard-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard · Member Area", robots: { index: false } };

export default async function MemberDashboardPage() {
  const { user, profile } = await requireAuth("/login?next=/member");
  const [library, orders, courses, memberships, schedule] = await Promise.all([
    getMemberLibrary(),
    getMemberOrders(user.id, 5),
    getMemberCourses(user.id),
    getMemberMemberships(user.id),
    getMemberSchedule(user.id),
  ]);

  return (
    <MemberDashboardView
      displayName={profile?.full_name || user.email.split("@")[0]}
      library={library}
      orders={orders}
      courses={courses}
      memberships={memberships}
      schedule={schedule}
    />
  );
}
