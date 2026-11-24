import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/supabase/auth";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { isMidtransConfigured } from "@/lib/midtrans";
import { detectPaymentChannels } from "@/lib/payment-channels";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Re-checks which Midtrans channels are active (tiny probe charges, cancelled immediately). */
export async function POST() {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 503 });
  }
  const auth = await assertAdminApi();
  if ("error" in auth) return auth.error;

  if (!isMidtransConfigured()) {
    return NextResponse.json({ error: "MIDTRANS_SERVER_KEY belum diatur." }, { status: 400 });
  }

  const result = await detectPaymentChannels();
  if (!result) {
    return NextResponse.json(
      { error: "Gagal menyimpan hasil. Pastikan migrasi 0002 sudah dijalankan." },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, channels: result.channels, detectedAt: result.detectedAt });
}
