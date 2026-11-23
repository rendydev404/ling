"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Crown,
  Download,
  ExternalLink,
  FileDown,
  Package,
  ShoppingBag,
  Ticket,
} from "lucide-react";
import { Badge, Card, CustomTabs, EmptyState } from "@/components/ui/controls";
import { formatDateID, formatDateTimeID, formatIDR } from "@/lib/utils";

export interface PortalData {
  buyerEmail: string;
  isDemoMode: boolean;
  orders: Array<{
    id: string;
    order_number: string;
    total_amount: number;
    payment_status: string;
    shipping_status: string;
    shipping_courier: string | null;
    shipping_tracking_number: string | null;
    created_at: string;
  }>;
  digitalAssets: Array<{
    id: string;
    product_title: string;
    title: string;
    asset_type: "file" | "external_url" | "license_key";
    external_url: string | null;
    license_key_value: string | null;
  }>;
  courses: Array<{
    product_id: string;
    slug: string;
    title: string;
    total_lessons: number;
    completed_lessons: number;
  }>;
  bookings: Array<{
    id: string;
    product_title: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    meeting_link: string | null;
    status: string;
  }>;
  tickets: Array<{
    id: string;
    product_title: string;
    ticket_code: string;
    event_date: string | null;
    event_location: string | null;
    event_meeting_url: string | null;
    status: string;
  }>;
  memberships: Array<{
    id: string;
    product_title: string;
    status: string;
    expires_at: string;
    community_link: string | null;
  }>;
}

export function BuyerPortalClient({ data }: { data: PortalData }) {
  const [tab, setTab] = React.useState("digital");

  return (
    <div className="min-h-screen text-[#0f172a]">
      <header className="sticky top-0 z-20 border-b-2 border-[#0f172a] bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#0f172a] bg-white px-2.5 py-1 text-xs font-extrabold text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#ecfeff]"
          >
            <ArrowLeft className="h-4 w-4" />
            Storefront
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs font-bold text-[#334155]">
              {data.buyerEmail}
            </span>
            <Link
              href="/affiliate"
              className="rounded-lg border-2 border-[#0f172a] bg-[#a855f7] px-3 py-1 text-xs font-extrabold text-white shadow-[2px_2px_0px_#0f172a] hover:bg-[#9333ea]"
            >
              Affiliate Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0f172a]">Buyer Portal & Library</h1>
          <p className="mt-1 text-sm font-medium text-[#475569]">
            Akses instan seluruh produk digital, kelas online, jadwal 1-on-1, tiket webinar, dan membership Anda.
          </p>
        </div>

        <CustomTabs
          activeTab={tab}
          onChange={setTab}
          tabs={[
            {
              id: "digital",
              label: "Produk Digital",
              icon: <FileDown className="h-3.5 w-3.5" />,
              badge: data.digitalAssets.length,
            },
            {
              id: "courses",
              label: "Kelas Saya",
              icon: <BookOpen className="h-3.5 w-3.5" />,
              badge: data.courses.length,
            },
            {
              id: "schedule",
              label: "Jadwal & Tiket",
              icon: <CalendarClock className="h-3.5 w-3.5" />,
              badge: data.bookings.length + data.tickets.length,
            },
            {
              id: "memberships",
              label: "Membership",
              icon: <Crown className="h-3.5 w-3.5" />,
              badge: data.memberships.length,
            },
            {
              id: "orders",
              label: "Riwayat Pesanan",
              icon: <ShoppingBag className="h-3.5 w-3.5" />,
              badge: data.orders.length,
            },
          ]}
        />

        {/* 1. Digital Assets */}
        {tab === "digital" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.digitalAssets.length === 0 ? (
              <div className="md:col-span-2">
                <EmptyState
                  icon={<FileDown className="h-5 w-5" />}
                  title="Belum ada produk digital"
                  description="Produk digital yang Anda beli akan langsung muncul di sini untuk diunduh."
                />
              </div>
            ) : (
              data.digitalAssets.map((asset) => (
                <Card key={asset.id} className="p-5 flex flex-col justify-between gap-4">
                  <div>
                    <Badge variant="success">{asset.asset_type}</Badge>
                    <h3 className="mt-2.5 text-sm font-extrabold text-[#0f172a]">{asset.title}</h3>
                    <p className="text-xs font-medium text-[#475569] mt-0.5">
                      {asset.product_title}
                    </p>
                    {asset.license_key_value && (
                      <div className="mt-3 rounded-lg border-2 border-[#0f172a] bg-[#f4f8fb] px-3 py-2 font-mono text-xs font-extrabold text-[#0f172a]">
                        Key: {asset.license_key_value}
                      </div>
                    )}
                  </div>
                  <div>
                    {asset.asset_type === "external_url" && asset.external_url ? (
                      <a
                        href={asset.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border-2 border-[#0f172a] bg-[#22d3ee] px-3.5 text-xs font-extrabold text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#06b6d4]"
                      >
                        Buka Akses
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <a
                        href={`/api/portal/download/${asset.id}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border-2 border-[#0f172a] bg-[#22d3ee] px-3.5 text-xs font-extrabold text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#06b6d4]"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Unduh File
                      </a>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* 2. Online Courses */}
        {tab === "courses" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.courses.length === 0 ? (
              <div className="md:col-span-2">
                <EmptyState
                  icon={<BookOpen className="h-5 w-5" />}
                  title="Belum ada kelas online"
                  description="Kelas yang Anda beli akan terbuka di sini beserta pelacakan progres belajar."
                />
              </div>
            ) : (
              data.courses.map((course) => {
                const pct =
                  course.total_lessons > 0
                    ? Math.round((course.completed_lessons / course.total_lessons) * 100)
                    : 0;
                return (
                  <Card key={course.product_id} className="p-5 space-y-4">
                    <div>
                      <Badge variant="info">Online Course</Badge>
                      <h3 className="mt-2.5 text-base font-extrabold text-[#0f172a]">
                        {course.title}
                      </h3>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-[#475569]">Progres Belajar</span>
                        <span className="text-[#0e7490]">
                          {course.completed_lessons}/{course.total_lessons} materi ({pct}%)
                        </span>
                      </div>
                      <div className="h-3 w-full rounded-md border-2 border-[#0f172a] bg-[#f1f5f9] overflow-hidden">
                        <div
                          className="h-full bg-[#22d3ee] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <Link
                      href={`/portal/course/${course.slug}`}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#0f172a] bg-[#a855f7] text-xs font-extrabold text-white shadow-[3px_3px_0px_#0f172a] hover:bg-[#9333ea]"
                    >
                      <BookOpen className="h-4 w-4" />
                      Mulai / Lanjutkan Belajar
                    </Link>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* 3. Bookings & Event Tickets */}
        {tab === "schedule" && (
          <div className="space-y-4">
            {data.bookings.map((b) => (
              <Card
                key={b.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="warning">1-on-1 Appointment</Badge>
                    <Badge variant={b.status === "confirmed" ? "success" : "neutral"}>
                      {b.status}
                    </Badge>
                  </div>
                  <h3 className="mt-2 text-sm font-extrabold text-[#0f172a]">{b.product_title}</h3>
                  <p className="mt-1 text-xs font-medium text-[#475569]">
                    {formatDateID(b.booking_date)} · {b.start_time} - {b.end_time} WIB
                  </p>
                </div>
                {b.meeting_link && (
                  <a
                    href={b.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border-2 border-[#0f172a] bg-[#22d3ee] px-3.5 text-xs font-extrabold text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#06b6d4]"
                  >
                    Masuk Ruang Meeting
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </Card>
            ))}

            {data.tickets.map((t) => (
              <Card
                key={t.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="info">
                      <Ticket className="h-3 w-3" /> E-Ticket
                    </Badge>
                    <span className="rounded-md border border-[#0f172a] bg-[#cffafe] px-2 py-0.5 font-mono text-xs font-extrabold text-[#0f172a]">
                      {t.ticket_code}
                    </span>
                  </div>
                  <h3 className="mt-2 text-sm font-extrabold text-[#0f172a]">{t.product_title}</h3>
                  <p className="mt-1 text-xs font-medium text-[#475569]">
                    {t.event_date ? formatDateTimeID(t.event_date) : "Jadwal terkonfirmasi"} ·{" "}
                    {t.event_location || "Online"}
                  </p>
                </div>
                {t.event_meeting_url && (
                  <a
                    href={t.event_meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border-2 border-[#0f172a] bg-[#a855f7] px-3.5 text-xs font-extrabold text-white shadow-[2px_2px_0px_#0f172a] hover:bg-[#9333ea]"
                  >
                    Link Acara
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </Card>
            ))}

            {data.bookings.length === 0 && data.tickets.length === 0 && (
              <EmptyState
                icon={<CalendarClock className="h-5 w-5" />}
                title="Belum ada jadwal atau tiket"
                description="Booking konsultasi 1-on-1 dan E-Ticket webinar Anda akan tampil di sini."
              />
            )}
          </div>
        )}

        {/* 4. Memberships */}
        {tab === "memberships" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.memberships.length === 0 ? (
              <div className="md:col-span-2">
                <EmptyState
                  icon={<Crown className="h-5 w-5" />}
                  title="Belum ada membership aktif"
                  description="Gabung komunitas eksklusif untuk membuka konten dan grup privat."
                />
              </div>
            ) : (
              data.memberships.map((m) => (
                <Card key={m.id} className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="success">
                      <CheckCircle2 className="h-3 w-3" /> Aktif
                    </Badge>
                    <span className="text-xs font-semibold text-[#475569]">
                      Berakhir: {formatDateID(m.expires_at)}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-[#0f172a]">{m.product_title}</h3>
                  {m.community_link && (
                    <a
                      href={m.community_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border-2 border-[#0f172a] bg-[#22d3ee] px-3.5 text-xs font-extrabold text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#06b6d4]"
                    >
                      Masuk Grup Privat
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {/* 5. Order History */}
        {tab === "orders" && (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b-2 border-[#0f172a] bg-[#ecfeff] text-xs font-extrabold uppercase tracking-wider text-[#0f172a]">
                  <tr>
                    <th className="px-5 py-3">No. Pesanan</th>
                    <th className="px-5 py-3">Total</th>
                    <th className="px-5 py-3">Status Bayar</th>
                    <th className="px-5 py-3">Pengiriman</th>
                    <th className="px-5 py-3">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-[#0f172a]/15">
                  {data.orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-xs font-semibold text-[#475569]">
                        Belum ada riwayat pesanan.
                      </td>
                    </tr>
                  ) : (
                    data.orders.map((o) => (
                      <tr key={o.id} className="hover:bg-[#f4f8fb]">
                        <td className="px-5 py-3.5 font-mono text-xs font-extrabold text-[#0f172a]">
                          {o.order_number}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-extrabold text-[#0f172a]">
                          {formatIDR(o.total_amount)}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={o.payment_status === "paid" ? "success" : "warning"}>
                            {o.payment_status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-xs font-medium text-[#334155]">
                          {o.shipping_status === "not_applicable" ? (
                            "-"
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold">
                              <Package className="h-3.5 w-3.5 text-[#7e22ce]" />
                              {o.shipping_courier} {o.shipping_tracking_number ?? "(Proses)"}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-medium text-[#475569]">
                          {formatDateTimeID(o.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
