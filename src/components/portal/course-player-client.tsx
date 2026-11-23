"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, FileText, PlayCircle } from "lucide-react";
import type { CourseLesson, CourseSection } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/controls";
import { useToast } from "@/components/ui/custom-toast";
import { getYouTubeEmbedUrl } from "@/lib/utils";

export function CoursePlayerClient({
  productId,
  courseTitle,
  sections,
  initialCompletedIds,
  isDemoMode,
}: {
  productId: string;
  courseTitle: string;
  sections: CourseSection[];
  initialCompletedIds: string[];
  isDemoMode: boolean;
}) {
  const { toast } = useToast();
  const allLessons = React.useMemo(
    () => sections.flatMap((s) => s.lessons ?? []),
    [sections]
  );

  const [activeLesson, setActiveLesson] = React.useState<CourseLesson | null>(
    allLessons[0] ?? null
  );
  const [completedIds, setCompletedIds] = React.useState<Set<string>>(
    new Set(initialCompletedIds)
  );
  const [saving, setSaving] = React.useState(false);

  const progressPct =
    allLessons.length > 0
      ? Math.round((completedIds.size / allLessons.length) * 100)
      : 0;

  async function toggleLessonComplete(lessonId: string) {
    const next = new Set(completedIds);
    const willComplete = !next.has(lessonId);
    if (willComplete) next.add(lessonId);
    else next.delete(lessonId);
    setCompletedIds(next);

    if (isDemoMode) {
      toast({
        type: "success",
        title: willComplete ? "Materi ditandai selesai" : "Status selesai dibatalkan",
      });
      return;
    }

    setSaving(true);
    try {
      await fetch("/api/portal/course/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, lessonId, completed: willComplete }),
      });
    } finally {
      setSaving(false);
    }
  }

  const embedUrl = activeLesson?.video_url
    ? getYouTubeEmbedUrl(activeLesson.video_url)
    : null;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
      <header className="sticky top-0 z-20 border-b border-[#e2e8f0] bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link
            href="/portal"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#475569] hover:text-[#0f172a]"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Buyer Portal
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-[#059669]">Progres: {progressPct}%</span>
            <div className="hidden sm:block w-28 h-2 rounded-full bg-[#e2e8f0] overflow-hidden">
              <div
                className="h-full bg-[#059669] rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Video / Content Stage */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="overflow-hidden">
            {embedUrl ? (
              <div className="aspect-video w-full bg-[#0f172a]">
                <iframe
                  src={embedUrl}
                  title={activeLesson?.title ?? "Video Materi"}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center bg-[#0f172a] text-white px-6 text-center">
                <FileText className="h-10 w-10 text-[#10b981] mb-3" />
                <p className="text-base font-bold">{activeLesson?.title ?? courseTitle}</p>
                <p className="mt-1 text-xs text-[#94a3b8]">Materi Teks & Panduan Praktik</p>
              </div>
            )}

            {activeLesson && (
              <div className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[#059669]">{courseTitle}</p>
                    <h1 className="text-lg font-extrabold text-[#0f172a]">
                      {activeLesson.title}
                    </h1>
                  </div>
                  <Button
                    size="sm"
                    variant={completedIds.has(activeLesson.id) ? "outline" : "primary"}
                    isLoading={saving}
                    onClick={() => toggleLessonComplete(activeLesson.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {completedIds.has(activeLesson.id) ? "Selesai Dipelajari" : "Tandai Selesai"}
                  </Button>
                </div>

                {activeLesson.body_markdown && (
                  <div className="border-t border-[#e2e8f0] pt-4 text-sm leading-relaxed text-[#334155] whitespace-pre-line">
                    {activeLesson.body_markdown}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Curriculum Sidebar */}
        <div className="lg:col-span-4 space-y-3">
          <Card className="p-4">
            <h2 className="text-sm font-extrabold text-[#0f172a] mb-3">Daftar Kurikulum</h2>
            <div className="space-y-4">
              {sections.map((sec) => (
                <div key={sec.id} className="space-y-1.5">
                  <p className="text-xs font-bold text-[#64748b] uppercase tracking-wider">
                    {sec.title}
                  </p>
                  <div className="space-y-1">
                    {(sec.lessons ?? []).map((lesson) => {
                      const isActive = activeLesson?.id === lesson.id;
                      const isDone = completedIds.has(lesson.id);
                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => setActiveLesson(lesson)}
                          className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                            isActive
                              ? "border-[#059669] bg-[#ecfdf5] text-[#047857] font-bold"
                              : "border-[#e2e8f0] bg-white text-[#0f172a] hover:bg-[#f8fafc]"
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#059669]" />
                          ) : lesson.content_type === "video" ? (
                            <PlayCircle className="h-4 w-4 shrink-0 text-[#64748b]" />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0 text-[#94a3b8]" />
                          )}
                          <span className="flex-1 truncate">{lesson.title}</span>
                          <span className="text-[11px] text-[#64748b]">
                            {lesson.duration_minutes}m
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
