import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { MemberEbook } from "@/lib/ebooks";

type Rel<T> = T | T[] | null;
const one = <T,>(v: Rel<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

/** Whole published ebook catalog for this member (owned + locked) in one RPC. */
export const getMemberLibrary = cache(async (): Promise<MemberEbook[]> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_member_library");
  if (error) {
    console.error("[member] get_member_library", error.message);
    return [];
  }
  return ((data ?? []) as MemberEbook[]).map((e) => ({
    ...e,
    file_size_bytes: e.file_size_bytes == null ? null : Number(e.file_size_bytes),
    buy_price: e.buy_price == null ? null : Number(e.buy_price),
    bookmarks: e.bookmarks ?? [],
  }));
});

export interface MemberOrder {
  id: string;
  order_number: string;
  total_amount: number;
  payment_status: string;
  shipping_status: string;
  shipping_courier: string | null;
  shipping_tracking_number: string | null;
  created_at: string;
  items: string[];
}

export async function getMemberOrders(userId: string, limit = 50): Promise<MemberOrder[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, order_number, total_amount, payment_status, shipping_status, shipping_courier, shipping_tracking_number, created_at, order_items(product_title)"
    )
    .eq("buyer_user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  return (data ?? []).map((o) => ({
    id: o.id,
    order_number: o.order_number,
    total_amount: Number(o.total_amount),
    payment_status: o.payment_status,
    shipping_status: o.shipping_status,
    shipping_courier: o.shipping_courier,
    shipping_tracking_number: o.shipping_tracking_number,
    created_at: o.created_at,
    items: ((o.order_items ?? []) as Array<{ product_title: string }>).map((i) => i.product_title),
  }));
}

export interface MemberCourse {
  product_id: string;
  slug: string;
  title: string;
  thumbnail_url: string | null;
  total_lessons: number;
  completed_lessons: number;
}

export async function getMemberCourses(userId: string): Promise<MemberCourse[]> {
  const supabase = await createServerSupabaseClient();
  const [enrollRes, progressRes] = await Promise.all([
    supabase
      .from("course_enrollments")
      .select("product_id, products(slug, title, thumbnail_url, course_lessons(count))")
      .eq("user_id", userId)
      .limit(100),
    supabase.from("course_lesson_progress").select("product_id").eq("user_id", userId).limit(5000),
  ]);
  const done = new Map<string, number>();
  for (const p of progressRes.data ?? []) done.set(p.product_id, (done.get(p.product_id) ?? 0) + 1);

  return (enrollRes.data ?? []).map((e) => {
    const prod = one(
      e.products as Rel<{ slug: string; title: string; thumbnail_url: string | null; course_lessons: Array<{ count: number }> }>
    );
    return {
      product_id: e.product_id,
      slug: prod?.slug ?? "",
      title: prod?.title ?? "Kelas Online",
      thumbnail_url: prod?.thumbnail_url ?? null,
      total_lessons: prod?.course_lessons?.[0]?.count ?? 0,
      completed_lessons: done.get(e.product_id) ?? 0,
    };
  });
}

export interface MemberBooking {
  id: string;
  product_title: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  meeting_link: string | null;
  status: string;
}
export interface MemberTicket {
  id: string;
  product_title: string;
  ticket_code: string;
  event_date: string | null;
  event_location: string | null;
  event_meeting_url: string | null;
  status: string;
}

export async function getMemberSchedule(userId: string): Promise<{ bookings: MemberBooking[]; tickets: MemberTicket[] }> {
  const supabase = await createServerSupabaseClient();
  const [bookingsRes, ticketsRes] = await Promise.all([
    supabase
      .from("appointment_bookings")
      .select("id, booking_date, start_time, end_time, meeting_link, status, products(title)")
      .eq("buyer_user_id", userId)
      .order("booking_date", { ascending: false })
      .limit(50),
    supabase
      .from("event_tickets")
      .select("id, ticket_code, status, products(title, metadata)")
      .eq("buyer_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  return {
    bookings: (bookingsRes.data ?? []).map((b) => ({
      id: b.id,
      product_title: one(b.products as Rel<{ title: string }>)?.title ?? "Sesi 1-on-1",
      booking_date: b.booking_date,
      start_time: String(b.start_time).slice(0, 5),
      end_time: String(b.end_time).slice(0, 5),
      meeting_link: b.meeting_link,
      status: b.status,
    })),
    tickets: (ticketsRes.data ?? []).map((t) => {
      const prod = one(t.products as Rel<{ title: string; metadata: Record<string, string> | null }>);
      const meta = prod?.metadata ?? {};
      return {
        id: t.id,
        product_title: prod?.title ?? "Webinar",
        ticket_code: t.ticket_code,
        event_date: meta.event_date ?? null,
        event_location: meta.event_location ?? null,
        event_meeting_url: meta.event_meeting_url ?? null,
        status: t.status,
      };
    }),
  };
}

export interface MemberMembership {
  id: string;
  product_title: string;
  status: string;
  expires_at: string;
  community_link: string | null;
}

export async function getMemberMemberships(userId: string): Promise<MemberMembership[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("membership_subscriptions")
    .select("id, status, expires_at, products(title, metadata)")
    .eq("user_id", userId)
    .order("expires_at", { ascending: false })
    .limit(20);
  return (data ?? []).map((m) => {
    const prod = one(m.products as Rel<{ title: string; metadata: Record<string, string> | null }>);
    const expired = new Date(m.expires_at).getTime() < Date.now();
    return {
      id: m.id,
      product_title: prod?.title ?? "Membership",
      status: expired && m.status === "active" ? "expired" : m.status,
      expires_at: m.expires_at,
      community_link: prod?.metadata?.community_link ?? null,
    };
  });
}
