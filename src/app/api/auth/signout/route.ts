import { NextResponse } from "next/server";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (isSupabaseServerConfigured()) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  }
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/login`, { status: 303 });
}
