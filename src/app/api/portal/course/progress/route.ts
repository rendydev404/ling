import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

const progressSchema = z.object({
  productId: z.string().uuid(),
  lessonId: z.string().uuid(),
  completed: z.boolean(),
});

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: true, simulated: true });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = progressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
  }

  if (parsed.data.completed) {
    await supabase.from("course_lesson_progress").upsert(
      {
        user_id: user.id,
        product_id: parsed.data.productId,
        lesson_id: parsed.data.lessonId,
      },
      { onConflict: "user_id,lesson_id" }
    );
  } else {
    await supabase
      .from("course_lesson_progress")
      .delete()
      .eq("user_id", user.id)
      .eq("lesson_id", parsed.data.lessonId);
  }

  return NextResponse.json({ ok: true });
}
