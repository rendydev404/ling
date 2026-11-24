import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyAccessToken } from "@/lib/order-access";
import type { ProductType } from "@/types/database";

export interface AccessAsset {
  id: string;
  title: string;
  kind: "file" | "external_url" | "license_key";
  licenseKey?: string | null;
}

export interface AccessItem {
  productId: string;
  title: string;
  type: ProductType;
  courseSlug?: string | null;
  assets: AccessAsset[];
  deliveryNote?: string | null;
  booking?: { date: string; start: string; end: string; meetingLink: string | null; status: string } | null;
  tickets: Array<{ code: string; status: string }>;
  event?: { date: string | null; location: string | null; meetingUrl: string | null } | null;
  membership?: { status: string; expiresAt: string | null; communityLink: string | null } | null;
  shipping?: { status: string; courier: string | null; tracking: string | null } | null;
}

export interface OrderAccessData {
  orderNumber: string;
  buyerName: string;
  buyerEmail: string;
  paidAt: string | null;
  items: AccessItem[];
}

type Meta = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);

/**
 * Everything a paid order unlocks, in 2 round-trips (order+items, then per-type lookups in parallel).
 * Returns null for a forged token or an order that isn't paid.
 */
export async function loadOrderAccess(token: string): Promise<OrderAccessData | null> {
  const orderNumber = verifyAccessToken(token);
  if (!orderNumber) return null;
  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, order_number, buyer_name, buyer_email, payment_status, paid_at, shipping_status, shipping_courier, shipping_tracking_number, order_items(product_id, product_title, product_type)"
    )
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (!order || order.payment_status !== "paid") return null;

  const rows = (order.order_items ?? []) as Array<{
    product_id: string;
    product_title: string;
    product_type: ProductType;
  }>;
  const productIds = [...new Set(rows.map((r) => r.product_id))];
  const digitalIds = rows.filter((r) => r.product_type === "digital").map((r) => r.product_id);
  const has = (t: ProductType) => rows.some((r) => r.product_type === t);

  const [productsRes, assetsRes, bookingsRes, ticketsRes, membershipsRes] = await Promise.all([
    productIds.length
      ? supabase.from("products").select("id, slug, metadata").in("id", productIds)
      : Promise.resolve({ data: [] as Array<{ id: string; slug: string; metadata: Meta }> }),
    digitalIds.length
      ? supabase
          .from("product_digital_assets")
          .select("id, product_id, title, asset_type, license_key_value, sort_order")
          .in("product_id", digitalIds)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    has("appointment")
      ? supabase
          .from("appointment_bookings")
          .select("product_id, booking_date, start_time, end_time, meeting_link, status")
          .eq("order_id", order.id)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    has("event")
      ? supabase.from("event_tickets").select("product_id, ticket_code, status").eq("order_id", order.id)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    has("membership")
      ? supabase
          .from("membership_subscriptions")
          .select("product_id, status, expires_at")
          .eq("order_id", order.id)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
  ]);

  const products = new Map(
    ((productsRes.data ?? []) as Array<{ id: string; slug: string; metadata: Meta | null }>).map(
      (p) => [p.id, p]
    )
  );

  const items: AccessItem[] = rows.map((row) => {
    const product = products.get(row.product_id);
    const meta = (product?.metadata ?? {}) as Meta;
    const item: AccessItem = {
      productId: row.product_id,
      title: row.product_title,
      type: row.product_type,
      assets: [],
      tickets: [],
    };

    if (row.product_type === "digital") {
      item.deliveryNote = str(meta.delivery_note);
      item.assets = ((assetsRes.data ?? []) as Array<Record<string, unknown>>)
        .filter((a) => a.product_id === row.product_id)
        .map((a) => ({
          id: String(a.id),
          title: String(a.title),
          kind: a.asset_type as AccessAsset["kind"],
          licenseKey: a.asset_type === "license_key" ? str(a.license_key_value) : null,
        }));
    } else if (row.product_type === "course") {
      item.courseSlug = product?.slug ?? null;
    } else if (row.product_type === "appointment") {
      const b = ((bookingsRes.data ?? []) as Array<Record<string, unknown>>).find(
        (x) => x.product_id === row.product_id
      );
      item.booking = b
        ? {
            date: String(b.booking_date),
            start: String(b.start_time).slice(0, 5),
            end: String(b.end_time).slice(0, 5),
            meetingLink: str(b.meeting_link) ?? str(meta.meeting_link),
            status: String(b.status),
          }
        : null;
    } else if (row.product_type === "event") {
      item.tickets = ((ticketsRes.data ?? []) as Array<Record<string, unknown>>)
        .filter((t) => t.product_id === row.product_id)
        .map((t) => ({ code: String(t.ticket_code), status: String(t.status) }));
      item.event = {
        date: str(meta.event_date),
        location: str(meta.event_location),
        meetingUrl: str(meta.event_meeting_url),
      };
    } else if (row.product_type === "membership") {
      const m = ((membershipsRes.data ?? []) as Array<Record<string, unknown>>).find(
        (x) => x.product_id === row.product_id
      );
      item.membership = {
        status: String(m?.status ?? "active"),
        expiresAt: str(m?.expires_at),
        communityLink: str(meta.community_link),
      };
    } else if (row.product_type === "physical") {
      item.shipping = {
        status: String(order.shipping_status ?? "processing"),
        courier: order.shipping_courier ?? null,
        tracking: order.shipping_tracking_number ?? null,
      };
    }
    return item;
  });

  return {
    orderNumber: order.order_number,
    buyerName: order.buyer_name,
    buyerEmail: order.buyer_email,
    paidAt: order.paid_at,
    items,
  };
}

/** Confirms an asset belongs to a digital product in this paid order. */
export async function resolveAccessAsset(
  token: string,
  assetId: string
): Promise<{ assetType: string; storagePath: string | null; externalUrl: string | null } | null> {
  const orderNumber = verifyAccessToken(token);
  if (!orderNumber) return null;
  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const [orderRes, assetRes] = await Promise.all([
    supabase
      .from("orders")
      .select("payment_status, order_items(product_id)")
      .eq("order_number", orderNumber)
      .maybeSingle(),
    supabase
      .from("product_digital_assets")
      .select("product_id, asset_type, storage_path, external_url")
      .eq("id", assetId)
      .maybeSingle(),
  ]);

  const order = orderRes.data;
  const asset = assetRes.data;
  if (!order || order.payment_status !== "paid" || !asset) return null;
  const owned = ((order.order_items ?? []) as Array<{ product_id: string }>).some(
    (i) => i.product_id === asset.product_id
  );
  if (!owned) return null;
  return {
    assetType: asset.asset_type,
    storagePath: asset.storage_path,
    externalUrl: asset.external_url,
  };
}
