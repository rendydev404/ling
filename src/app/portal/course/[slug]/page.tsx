import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/storefront-data";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import { CoursePlayerClient } from "@/components/portal/course-player-client";

export const dynamic = "force-dynamic";

export default async function PortalCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { product, courseSections, isDemoMode } = await getProductBySlug(slug);

  if (!product || product.type !== "course") {
    notFound();
  }

  let completedIds: string[] = [];

  if (isSupabaseServerConfigured()) {
    const { user } = await requireAuth(`/login?next=/portal/course/${slug}`);
    const supabase = await createServerSupabaseClient();
    const { data: progress } = await supabase
      .from("course_lesson_progress")
      .select("lesson_id")
      .eq("user_id", user.id)
      .eq("product_id", product.id);
    completedIds = (progress ?? []).map((p) => p.lesson_id as string);
  }

  return (
    <CoursePlayerClient
      productId={product.id}
      courseTitle={product.title}
      sections={courseSections}
      initialCompletedIds={completedIds}
      isDemoMode={isDemoMode}
    />
  );
}
