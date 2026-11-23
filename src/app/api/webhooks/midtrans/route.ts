import { NextResponse } from "next/server";
import { verifyMidtransSignature } from "@/lib/midtrans";
import { syncOrderPaymentStatus } from "@/lib/order-fulfillment";

interface MidtransNotification {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
  merchant_id?: string;
}

export async function POST(request: Request) {
  let payload: MidtransNotification;
  try {
    payload = (await request.json()) as MidtransNotification;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const isValidSignature = verifyMidtransSignature({
    orderId: payload.order_id,
    statusCode: payload.status_code,
    grossAmount: payload.gross_amount,
    signatureKey: payload.signature_key,
    merchantId: payload.merchant_id,
  });

  if (!isValidSignature) {
    return NextResponse.json({ error: "Invalid Midtrans signature" }, { status: 403 });
  }

  const result = await syncOrderPaymentStatus({
    midtransOrderId: payload.order_id,
    transactionStatus: payload.transaction_status,
    fraudStatus: payload.fraud_status,
    paymentType: payload.payment_type,
    rawPayload: payload as unknown as Record<string, unknown>,
  });

  if (result.simulated) {
    return NextResponse.json({ ok: true, simulated: true });
  }

  if (!result.found) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (result.idempotent) {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  return NextResponse.json({ ok: true, status: result.status });
}
