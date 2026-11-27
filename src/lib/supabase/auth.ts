import { cache } from "react";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
  isSupabaseServerConfigured,
} from "./server";
import type { Profile } from "@/types/database";

export const PRIMARY_ADMIN_EMAIL = "rendyakun50@gmail.com";

const PROFILE_COLUMNS =
  "id, email, full_name, phone, avatar_url, role, bank_name, bank_account_number, bank_account_holder, created_at";

export function isPrimaryAdminEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === PRIMARY_ADMIN_EMAIL;
}

export const getCurrentUserProfile = cache(async (): Promise<{
  user: { id: string; email: string } | null;
  profile: Profile | null;
}> => {
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

  const email = user.email ?? "";
  const isOwnerEmail = isPrimaryAdminEmail(email);

  // Fast-path for Primary Admin: skip redundant DB profile round-trip on every navigation
  if (isOwnerEmail) {
    return {
      user: { id: user.id, email },
      profile: {
        id: user.id,
        email,
        full_name:
          (user.user_metadata?.full_name as string | undefined) || "Rendy (Admin)",
        phone: (user.user_metadata?.phone as string | undefined) ?? null,
        avatar_url: null,
        role: "admin",
        bank_name: null,
        bank_account_number: null,
        bank_account_holder: null,
        created_at: user.created_at ?? new Date().toISOString(),
      },
    };
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .single();

  if (profile) {
    return {
      user: { id: user.id, email },
      profile: profile as Profile,
    };
  }

  if (profileErr?.code !== "PGRST205") {
    const serviceClient = createServiceRoleClient();
    if (serviceClient) {
      const fullName =
        (user.user_metadata?.full_name as string | undefined) ||
        email.split("@")[0] ||
        "Pengguna";

      const { data: created } = await serviceClient
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email,
            full_name: fullName,
            phone: (user.user_metadata?.phone as string | undefined) ?? null,
            role: "buyer",
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
    user: { id: user.id, email },
    profile: null,
  };
});

export async function requireAuth(redirectTo = "/login") {
  const { user, profile } = await getCurrentUserProfile();
  if (!user) {
    redirect(redirectTo);
  }
  return { user, profile };
}

/**
 * Protects /admin routes silently: unauthenticated or non-admin visitors
 * are redirected straight to "/" so the hidden admin login gate is never exposed.
 */
export async function requireAdmin() {
  const { user, profile } = await getCurrentUserProfile();
  if (!user) {
    redirect("/");
  }
  if (profile?.role !== "admin" && !isPrimaryAdminEmail(user.email)) {
    redirect("/");
  }
  return { user, profile };
}

/**
 * Verifies admin access (deduped per request via React.cache) and returns the
 * service-role client so admin RSC queries skip per-row RLS subquery overhead.
 */
export const getAdminSupabaseClient = cache(async () => {
  await requireAdmin();
  return createServiceRoleClient() ?? (await createServerSupabaseClient());
});

/**
 * Shared guard for /api/admin/* endpoints.
 */
export async function assertAdminApi() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (isPrimaryAdminEmail(user.email)) {
    const db = createServiceRoleClient() ?? supabase;
    return { supabase: db, user };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const db = createServiceRoleClient() ?? supabase;
  return { supabase: db, user };
}
