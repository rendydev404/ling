import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient, createServiceRoleClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { generateReferralCode } from "@/lib/utils";

const schema = z.object({
  referralCode: z
    .string()
    .regex(/^[A-Z0-9]{4,20}$/)
    .optional(),
});

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: true, simulated: true });
  }

  const userClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan login dahulu." }, { status: 401 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Kode referral harus 4-20 huruf/angka." }, { status: 400 });
  }

  const service = createServiceRoleClient();
  if (!service) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const { data: settings } = await service
    .from("store_settings")
    .select("affiliate_auto_approve, seo_config")
    .eq("singleton_key", "primary")
    .single();

  const seoConfig = (settings?.seo_config ?? null) as { affiliateProgramEnabled?: boolean } | null;
  if (seoConfig?.affiliateProgramEnabled === false) {
    return NextResponse.json(
      { error: "Program affiliate sedang dinonaktifkan oleh pemilik toko." },
      { status: 403 }
    );
  }

  const code = parsed.data.referralCode || generateReferralCode(user.email ?? "PARTNER");

  const { error } = await service.from("affiliates").upsert(
    {
      user_id: user.id,
      referral_code: code,
      status: settings?.affiliate_auto_approve === false ? "pending" : "active",
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return NextResponse.json({ error: "Kode referral sudah digunakan. Coba kode lain." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, referral_code: code });
}
