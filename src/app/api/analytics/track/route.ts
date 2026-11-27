import { after, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";

const trackSchema = z.object({
  event_type: z.enum(["page_view", "product_view", "link_click", "checkout_start"]),
  product_id: z.string().uuid().nullable().optional(),
  block_id: z.string().uuid().nullable().optional(),
  referrer: z.string().max(400).nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ ok: true, simulated: true });
    }

    const body = await request.json();
    const parsed = trackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const payload = {
      event_type: parsed.data.event_type,
      product_id: parsed.data.product_id ?? null,
      block_id: parsed.data.block_id ?? null,
      referrer: parsed.data.referrer ?? null,
    };

    after(async () => {
      await supabase.from("analytics_events").insert(payload);
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
