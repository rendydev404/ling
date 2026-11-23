import { createServiceRoleClient } from "@/lib/supabase/server";
import { mapMidtransStatus } from "@/lib/midtrans";
import { calculateAffiliateCommission } from "@/lib/checkout-engine";
import { dispatchOutboundWebhooks } from "@/lib/webhooks";
import { generateTicketCode } from "@/lib/utils";
import type { PaymentStatus } from "@/types/database";

export interface SyncOrderPaymentParams {
  midtransOrderId: string;
  transactionStatus: string;
  fraudStatus?: string;
  paymentType?: string;
  rawPayload?: Record<string, unknown>;
}

export async function syncOrderPaymentStatus(params: SyncOrderPaymentParams): Promise<{
  simulated?: boolean;
  found: boolean;
  idempotent?: boolean;
  status?: PaymentStatus;
}> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { simulated: true, found: false };
  }

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, order_number, buyer_user_id, buyer_name, buyer_email, buyer_phone, voucher_id, affiliate_id, subtotal, discount_amount, total_amount, payment_status, buyer_note"
    )
    .eq("midtrans_order_id", params.midtransOrderId)
    .single();

  if (!order) {
    return { found: false };
  }

  const nextStatus = mapMidtransStatus(params.transactionStatus, params.fraudStatus);

  // Idempotency guard: already paid orders only transition if refunded, never re-running fulfillment
  if (order.payment_status === "paid") {
    if (nextStatus === "refunded") {
      await supabase
        .from("orders")
        .update({
          payment_status: "refunded",
          midtrans_raw_payload: params.rawPayload ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);
      return { found: true, status: "refunded" };
    }
    return { found: true, idempotent: true, status: "paid" };
  }

  await supabase
    .from("orders")
    .update({
      payment_status: nextStatus,
      payment_method: params.paymentType ?? null,
      midtrans_raw_payload: params.rawPayload ?? null,
      paid_at: nextStatus === "paid" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  // Release appointment hold if expired / cancelled
  if (nextStatus === "expired" || nextStatus === "cancelled") {
    await supabase
      .from("appointment_bookings")
      .update({ status: "cancelled" })
      .eq("order_id", order.id);

    await dispatchOutboundWebhooks("order.expired", {
      order_number: order.order_number,
      buyer_email: order.buyer_email,
      status: nextStatus,
    });
    return { found: true, status: nextStatus };
  }

  // Run Auto-Fulfillment Engine when PAID
  if (nextStatus === "paid") {
    const { data: items } = await supabase
      .from("order_items")
      .select(
        "id, product_id, variant_id, product_title, product_type, total_price, quantity, metadata"
      )
      .eq("order_id", order.id);

    const productIds = (items ?? []).map((i) => i.product_id as string);
    const { data: productsData } = productIds.length
      ? await supabase
          .from("products")
          .select("id, affiliate_enabled, affiliate_commission_pct, metadata")
          .in("id", productIds)
      : { data: [] };

    const productMap = new Map(
      (productsData ?? []).map((p) => [p.id as string, p])
    );

    // Increment voucher usage if used
    if (order.voucher_id) {
      const { data: v } = await supabase
        .from("vouchers")
        .select("used_count")
        .eq("id", order.voucher_id)
        .single();
      if (v) {
        await supabase
          .from("vouchers")
          .update({ used_count: Number(v.used_count || 0) + 1 })
          .eq("id", order.voucher_id);
      }
    }

    for (const item of items ?? []) {
      const prod = productMap.get(item.product_id as string);
      const prodMeta = (prod?.metadata as { duration_days?: number } | null) ?? {};

      if (item.product_type === "course") {
        await supabase.from("course_enrollments").upsert(
          {
            order_id: order.id,
            product_id: item.product_id,
            user_id: order.buyer_user_id,
            buyer_email: order.buyer_email,
          },
          { onConflict: "product_id,buyer_email" }
        );
      } else if (item.product_type === "appointment") {
        await supabase
          .from("appointment_bookings")
          .update({ status: "confirmed" })
          .eq("order_id", order.id);
      } else if (item.product_type === "event") {
        await supabase.from("event_tickets").insert({
          order_id: order.id,
          product_id: item.product_id,
          buyer_user_id: order.buyer_user_id,
          ticket_code: generateTicketCode(),
          attendee_name: order.buyer_name,
          attendee_email: order.buyer_email,
          attendee_phone: order.buyer_phone,
          status: "valid",
        });
      } else if (item.product_type === "membership") {
        const durationDays = prodMeta.duration_days ?? 30;
        const expiresAt = new Date(Date.now() + durationDays * 86400_000).toISOString();
        await supabase.from("membership_subscriptions").insert({
          order_id: order.id,
          product_id: item.product_id,
          user_id: order.buyer_user_id,
          buyer_email: order.buyer_email,
          status: "active",
          starts_at: new Date().toISOString(),
          expires_at: expiresAt,
        });
      } else if (item.product_type === "donation") {
        const itemMeta =
          (item.metadata as { donation_anonymous?: boolean; buyer_note?: string } | null) ?? {};
        await supabase.from("donations").upsert(
          {
            order_id: order.id,
            product_id: item.product_id,
            supporter_name: itemMeta.donation_anonymous ? "Anonim" : order.buyer_name,
            is_anonymous: Boolean(itemMeta.donation_anonymous),
            message: itemMeta.buyer_note || order.buyer_note || null,
            amount: Number(item.total_price),
            is_visible: true,
          },
          { onConflict: "order_id" }
        );
      }

      // Affiliate Commission Ledger
      if (order.affiliate_id && prod?.affiliate_enabled) {
        const pct = Number(prod.affiliate_commission_pct || 0);
        const proportionalNet = Math.max(
          0,
          Number(item.total_price) -
            (Number(order.subtotal) > 0
              ? (Number(item.total_price) / Number(order.subtotal)) *
                Number(order.discount_amount)
              : 0)
        );
        const commissionAmount = calculateAffiliateCommission(proportionalNet, pct);

        if (commissionAmount > 0) {
          await supabase.from("affiliate_commissions").upsert(
            {
              affiliate_id: order.affiliate_id,
              order_id: order.id,
              product_id: item.product_id,
              order_net_amount: Math.round(proportionalNet),
              commission_pct: pct,
              commission_amount: commissionAmount,
              status: "available",
            },
            { onConflict: "affiliate_id,order_id,product_id" }
          );

          const { data: aff } = await supabase
            .from("affiliates")
            .select("total_conversions, total_earned")
            .eq("id", order.affiliate_id)
            .single();
          if (aff) {
            await supabase
              .from("affiliates")
              .update({
                total_conversions: Number(aff.total_conversions || 0) + 1,
                total_earned: Number(aff.total_earned || 0) + commissionAmount,
              })
              .eq("id", order.affiliate_id);
          }
        }
      }
    }

    // Record analytics purchase event
    await supabase.from("analytics_events").insert({
      event_type: "purchase",
      product_id: productIds[0] ?? null,
      revenue_amount: Number(order.total_amount),
    });

    // Trigger Outbound Webhooks (WhatsApp / Email CRM automation)
    await dispatchOutboundWebhooks("order.paid", {
      order_number: order.order_number,
      buyer_name: order.buyer_name,
      buyer_email: order.buyer_email,
      buyer_phone: order.buyer_phone,
      total_amount: Number(order.total_amount),
      payment_method: params.paymentType ?? null,
      items: (items ?? []).map((i) => ({
        title: i.product_title,
        type: i.product_type,
        price: Number(i.total_price),
      })),
    });
  }

  return { found: true, status: nextStatus };
}
