import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient, createServiceRoleClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

const payoutSchema = z.object({
  amount: z.number().min(50000),
  bank_name: z.string().min(2).max(60),
  bank_account_number: z.string().min(5).max(40),
  bank_account_holder: z.string().min(2).max(100),
});

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: true, simulated: true });
  }

  const userClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = payoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data pencairan tidak valid." }, { status: 400 });
  }

  const service = createServiceRoleClient();
  if (!service) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const { data: aff } = await service
    .from("affiliates")
    .select("id, total_earned, total_paid_out")
    .eq("user_id", user.id)
    .single();

  if (!aff) return NextResponse.json({ error: "Akun affiliate tidak ditemukan." }, { status: 404 });

  const available = Number(aff.total_earned) - Number(aff.total_paid_out);
  if (parsed.data.amount > available) {
    return NextResponse.json({ error: "Saldo komisi tidak mencukupi." }, { status: 400 });
  }

  const { error } = await service.from("affiliate_payouts").insert({
    affiliate_id: aff.id,
    amount: parsed.data.amount,
    bank_name: parsed.data.bank_name,
    bank_account_number: parsed.data.bank_account_number,
    bank_account_holder: parsed.data.bank_account_holder,
    status: "requested",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
