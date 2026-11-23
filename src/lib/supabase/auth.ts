import { redirect } from "next/navigation";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "./server";
import type { Profile } from "@/types/database";

export async function getCurrentUserProfile(): Promise<{
  user: { id: string; email: string } | null;
  profile: Profile | null;
}> {
  if (!isSupabaseServerConfigured()) {
    return { user: null, profile: null };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, phone, avatar_url, role, bank_name, bank_account_number, bank_account_holder, created_at"
    )
    .eq("id", user.id)
    .single();

  return {
    user: { id: user.id, email: user.email ?? "" },
    profile: (profile as Profile | null) ?? null,
  };
}

export async function requireAuth(redirectTo = "/login") {
  const { user, profile } = await getCurrentUserProfile();
  if (!user) {
    redirect(redirectTo);
  }
  return { user, profile };
}

export async function requireAdmin() {
  const { user, profile } = await getCurrentUserProfile();
  if (!user) {
    redirect("/login?next=/admin");
  }
  if (profile?.role !== "admin") {
    redirect("/portal");
  }
  return { user, profile };
}
