import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import { BuyerPortalClient, type PortalData } from "@/components/portal/buyer-portal-client";

export const dynamic = "force-dynamic";

export default async function BuyerPortalPage() {
  if (!isSupabaseServerConfigured()) {
    const demoData: PortalData = {
      buyerEmail: "pembeli@demo.local",
      isDemoMode: true,
      orders: [
        {
          id: "ord-1",
          order_number: "LNG-261123-8X2KA",
          total_amount: 299000,
          payment_status: "paid",
          shipping_status: "not_applicable",
          shipping_courier: null,
          shipping_tracking_number: null,
          created_at: new Date().toISOString(),
        },
      ],
      digitalAssets: [
        {
          id: "asset-demo-1",
          product_title: "Notion Creator OS & Finance Tracker",
          title: "Link Duplikasi Workspace Notion + Panduan PDF",
          asset_type: "external_url",
          external_url: "https://notion.so",
          license_key_value: "LING-PRO-8842-K91",
        },
      ],
      courses: [
        {
          product_id: "prod-course-1",
          slug: "kelas-bangun-bisnis-digital",
          title: "Masterclass: Bangun Bisnis Produk Digital dari Nol",
          total_lessons: 3,
          completed_lessons: 1,
        },
      ],
      bookings: [
        {
          id: "book-demo-1",
          product_title: "Sesi Konsultasi & Audit Bisnis 1-on-1 (60 Menit)",
          booking_date: "2026-12-02",
          start_time: "14:00",
          end_time: "15:00",
          meeting_link: "https://meet.google.com/new",
          status: "confirmed",
        },
      ],
      tickets: [
        {
          id: "tkt-demo-1",
          product_title: "Live Workshop: Scale Up Penjualan dengan QRIS & Affiliate",
          ticket_code: "EVT-9K4M2P",
          event_date: "2026-12-12T19:00:00+07:00",
          event_location: "Zoom Webinar",
          event_meeting_url: "https://zoom.us",
          status: "valid",
        },
      ],
      memberships: [
        {
          id: "mem-demo-1",
          product_title: "Ling Inner Circle — Komunitas & Riset Bulanan",
          status: "active",
          expires_at: new Date(Date.now() + 28 * 86400_000).toISOString(),
          community_link: "https://t.me/+example-inner-circle",
        },
      ],
    };
    return <BuyerPortalClient data={demoData} />;
  }

  const { user } = await requireAuth("/login?next=/portal");
  const supabase = await createServerSupabaseClient();

  const [ordersRes, enrollmentsRes, bookingsRes, ticketsRes, membershipsRes, progressRes] =
    await Promise.all([
      supabase
        .from("orders")
        .select(
          "id, order_number, total_amount, payment_status, shipping_status, shipping_courier, shipping_tracking_number, created_at"
        )
        .eq("buyer_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("course_enrollments")
        .select("product_id, products(slug, title)")
        .eq("user_id", user.id)
        .limit(50),
      supabase
        .from("appointment_bookings")
        .select("id, booking_date, start_time, end_time, meeting_link, status, products(title)")
        .eq("buyer_user_id", user.id)
        .order("booking_date", { ascending: false })
        .limit(50),
      supabase
        .from("event_tickets")
        .select("id, ticket_code, status, products(title, metadata)")
        .eq("buyer_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("membership_subscriptions")
        .select("id, status, expires_at, products(title, metadata)")
        .eq("user_id", user.id)
        .order("expires_at", { ascending: false })
        .limit(20),
      supabase
        .from("course_lesson_progress")
        .select("product_id, lesson_id")
        .eq("user_id", user.id)
        .limit(500),
    ]);

  // Fetch purchased digital assets via RLS-scoped query
  const { data: assetsData } = await supabase
    .from("product_digital_assets")
    .select("id, title, asset_type, external_url, license_key_value, products(title)")
    .limit(100);

  const enrolledIds = (enrollmentsRes.data ?? []).map((e) => e.product_id as string);
  const { data: lessonsCounts } = enrolledIds.length
    ? await supabase
        .from("course_lessons")
        .select("id, product_id")
        .in("product_id", enrolledIds)
    : { data: [] };

  const totalByCourse = new Map<string, number>();
  for (const l of lessonsCounts ?? []) {
    totalByCourse.set(l.product_id, (totalByCourse.get(l.product_id) ?? 0) + 1);
  }
  const doneByCourse = new Map<string, number>();
  for (const p of progressRes.data ?? []) {
    doneByCourse.set(p.product_id, (doneByCourse.get(p.product_id) ?? 0) + 1);
  }

  const portalData: PortalData = {
    buyerEmail: user.email,
    isDemoMode: false,
    orders: (ordersRes.data ?? []).map((o) => ({
      ...o,
      total_amount: Number(o.total_amount),
    })),
    digitalAssets: (assetsData ?? []).map((a) => {
      const prod = Array.isArray(a.products) ? a.products[0] : a.products;
      return {
        id: a.id,
        product_title: (prod as { title?: string } | null)?.title ?? "Produk Digital",
        title: a.title,
        asset_type: a.asset_type,
        external_url: a.external_url,
        license_key_value: a.license_key_value,
      };
    }),
    courses: (enrollmentsRes.data ?? []).map((e) => {
      const prod = Array.isArray(e.products) ? e.products[0] : e.products;
      return {
        product_id: e.product_id,
        slug: (prod as { slug?: string } | null)?.slug ?? "",
        title: (prod as { title?: string } | null)?.title ?? "Kelas Online",
        total_lessons: totalByCourse.get(e.product_id) ?? 0,
        completed_lessons: doneByCourse.get(e.product_id) ?? 0,
      };
    }),
    bookings: (bookingsRes.data ?? []).map((b) => {
      const prod = Array.isArray(b.products) ? b.products[0] : b.products;
      return {
        id: b.id,
        product_title: (prod as { title?: string } | null)?.title ?? "Sesi 1-on-1",
        booking_date: b.booking_date,
        start_time: b.start_time,
        end_time: b.end_time,
        meeting_link: b.meeting_link,
        status: b.status,
      };
    }),
    tickets: (ticketsRes.data ?? []).map((t) => {
      const prod = Array.isArray(t.products) ? t.products[0] : t.products;
      const meta = ((prod as { metadata?: Record<string, string> } | null)?.metadata ?? {});
      return {
        id: t.id,
        product_title: (prod as { title?: string } | null)?.title ?? "Webinar",
        ticket_code: t.ticket_code,
        event_date: meta.event_date ?? null,
        event_location: meta.event_location ?? null,
        event_meeting_url: meta.event_meeting_url ?? null,
        status: t.status,
      };
    }),
    memberships: (membershipsRes.data ?? []).map((m) => {
      const prod = Array.isArray(m.products) ? m.products[0] : m.products;
      const meta = ((prod as { metadata?: Record<string, string> } | null)?.metadata ?? {});
      return {
        id: m.id,
        product_title: (prod as { title?: string } | null)?.title ?? "Membership",
        status: m.status,
        expires_at: m.expires_at,
        community_link: meta.community_link ?? null,
      };
    }),
  };

  return <BuyerPortalClient data={portalData} />;
}
