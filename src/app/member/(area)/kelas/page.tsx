import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, PlayCircle } from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ui/controls";
import { requireAuth } from "@/lib/supabase/auth";
import { getMemberCourses } from "@/lib/member-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Kelas Saya · Member Area", robots: { index: false } };

export default async function MemberCoursesPage() {
  const { user } = await requireAuth("/login?next=/member/kelas");
  const courses = await getMemberCourses(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0f172a]">Kelas Saya</h1>
        <p className="mt-1 text-sm font-medium text-[#475569]">Lanjutkan belajar dan pantau progres setiap kelas.</p>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="h-5 w-5" />}
          title="Belum ada kelas online"
          description="Kelas yang Anda beli akan terbuka di sini beserta pelacakan progres belajar."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => {
            const pct = c.total_lessons > 0 ? Math.round((c.completed_lessons / c.total_lessons) * 100) : 0;
            return (
              <Card key={c.product_id} className="flex flex-col overflow-hidden">
                <div className="relative aspect-video border-b-2 border-[#0f172a] bg-[#f3e8ff]">
                  {c.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <GraduationCap className="h-10 w-10 text-[#7e22ce]" />
                    </div>
                  )}
                  {pct >= 100 && (
                    <Badge variant="success" className="absolute left-3 top-3">
                      Selesai
                    </Badge>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-4 p-5">
                  <h3 className="line-clamp-2 text-base font-extrabold text-[#0f172a]">{c.title}</h3>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#475569]">Progres</span>
                      <span className="text-[#0e7490]">
                        {c.completed_lessons}/{c.total_lessons} materi ({pct}%)
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-md border-2 border-[#0f172a] bg-[#f1f5f9]">
                      <div className="h-full bg-[#22d3ee]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <Link
                    href={`/portal/course/${c.slug}`}
                    className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-xl border-2 border-[#0f172a] bg-[#a855f7] text-xs font-extrabold text-white shadow-[3px_3px_0px_#0f172a] hover:bg-[#9333ea]"
                  >
                    <PlayCircle className="h-4 w-4" />
                    {c.completed_lessons > 0 ? "Lanjutkan belajar" : "Mulai belajar"}
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
