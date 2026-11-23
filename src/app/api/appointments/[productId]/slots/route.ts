import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateAppointmentSlots } from "@/lib/checkout-engine";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const dateStr = new URL(request.url).searchParams.get("date");

  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "Format tanggal harus YYYY-MM-DD" }, { status: 400 });
  }

  const dayOfWeek = new Date(`${dateStr}T00:00:00`).getDay();
  const supabase = createServiceRoleClient();

  if (!supabase) {
    // Demo mode slots (Mon-Fri 09:00-17:00)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json({ slots: [] });
    }
    const slots = generateAppointmentSlots({
      startTime: "09:00",
      endTime: "17:00",
      durationMinutes: 60,
      bufferMinutes: 15,
      bookedStartTimes: ["11:30"],
    });
    return NextResponse.json({ slots });
  }

  const [productRes, availRes, bookingsRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, metadata")
      .eq("id", productId)
      .single(),
    supabase
      .from("appointment_availability")
      .select("start_time, end_time, is_active")
      .eq("product_id", productId)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true)
      .single(),
    supabase
      .from("appointment_bookings")
      .select("start_time")
      .eq("product_id", productId)
      .eq("booking_date", dateStr)
      .in("status", ["pending_payment", "confirmed"]),
  ]);

  if (!availRes.data) {
    return NextResponse.json({ slots: [] });
  }

  const meta = (productRes.data?.metadata as { duration_minutes?: number; buffer_minutes?: number } | null) ?? {};
  const bookedStartTimes = (bookingsRes.data ?? []).map((b) => b.start_time as string);

  const slots = generateAppointmentSlots({
    startTime: availRes.data.start_time,
    endTime: availRes.data.end_time,
    durationMinutes: meta.duration_minutes ?? 60,
    bufferMinutes: meta.buffer_minutes ?? 15,
    bookedStartTimes,
  });

  return NextResponse.json({ slots });
}
