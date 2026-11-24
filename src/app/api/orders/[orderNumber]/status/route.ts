import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getMidtransTransactionStatus, isMidtransConfigured } from "@/lib/midtrans";
import { syncOrderPaymentStatus } from "@/lib/order-fulfillment";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Lightweight status poll for our own payment page.
 * Reads one row from the DB (kept fresh by the Midtrans webhook); with ?live=1 it also asks
 * the Midtrans status API, so payments still confirm where the webhook can't reach (localhost).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await params;
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ status: "pending" }, { headers: NO_STORE });
  }

  const { data: order } = await supabase
    .from("orders")
    .select("midtrans_order_id, payment_status")
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404, headers: NO_STORE });
  }

  let status = order.payment_status as string;
  const live = new URL(request.url).searchParams.get("live") === "1";

  if (status === "pending" && live && isMidtransConfigured()) {
    const liveStatus = await getMidtransTransactionStatus(order.midtrans_order_id);
    if (liveStatus) {
      const synced = await syncOrderPaymentStatus({
        midtransOrderId: order.midtrans_order_id,
        transactionStatus: liveStatus.transactionStatus,
        fraudStatus: liveStatus.fraudStatus,
        paymentType: liveStatus.paymentType,
        rawPayload: liveStatus.raw,
      });
      if (synced.status) status = synced.status;
    }
  }

  return NextResponse.json({ status }, { headers: NO_STORE });
}
