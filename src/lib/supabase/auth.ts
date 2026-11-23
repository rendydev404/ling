import { redirect } from "next/navigation";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
  isSupabaseServerConfigured,
} from "./server";
import type { Profile } from "@/types/database";

const PROFILE_COLUMNS =
  "id, email, full_name, phone, avatar_url, role, bank_name, bank_account_number, bank_account_holder, created_at";

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

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .single();

  if (profile) {
    return {
      user: { id: user.id, email: user.email ?? "" },
      profile: profile as Profile,
    };
  }

  // Auto-provision profile row if user already existed in auth.users before schema reset
  if (profileErr?.code !== "PGRST205") {
    const serviceClient = createServiceRoleClient();
    if (serviceClient) {
      const { count: adminCount } = await serviceClient
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");

      const assignedRole = (adminCount ?? 0) === 0 ? "admin" : "buyer";
      const email = user.email ?? "";
      const fullName =
        (user.user_metadata?.full_name as string | undefined) ||
        email.split("@")[0] ||
        "Kreator";

      const { data: created } = await serviceClient
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email,
            full_name: fullName,
            phone: (user.user_metadata?.phone as string | undefined) ?? null,
            role: assignedRole,
          },
          { onConflict: "id" }
        )
        .select(PROFILE_COLUMNS)
        .single();

      if (created) {
        return {
          user: { id: user.id, email },
          profile: created as Profile,
        };
      }
    }
  }

  return {
    user: { id: user.id, email: user.email ?? "" },
    profile: null,
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
