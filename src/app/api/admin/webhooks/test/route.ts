import { NextResponse } from "next/server";
import { z } from "zod";
import { signWebhookPayload } from "@/lib/webhooks";

const schema = z.object({
  targetUrl: z.string().url(),
  secretKey: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "URL tidak valid" }, { status: 400 });
  }

  const testPayload = JSON.stringify({
    event: "order.paid.test",
    timestamp: new Date().toISOString(),
    data: {
      order_number: "LNG-TEST-0001",
      buyer_name: "Test Buyer",
      buyer_email: "test@example.com",
      total_amount: 99000,
    },
  });

  const signature = signWebhookPayload(testPayload, parsed.data.secretKey);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(parsed.data.targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Ling-Event": "order.paid.test",
        "X-Ling-Signature": signature,
      },
      body: testPayload,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return NextResponse.json({ ok: res.ok, status: res.status });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    });
  }
}
