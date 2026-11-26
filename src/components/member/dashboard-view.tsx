import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  Crown,
  GraduationCap,
  Lock,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ui/controls";
import type { MemberBooking, MemberCourse, MemberMembership, MemberOrder, MemberTicket } from "@/lib/member-data";
import type { MemberEbook } from "@/lib/ebooks";
import { ebookProgressPct } from "@/lib/ebooks";
import { cn, formatDateID, formatIDR } from "@/lib/utils";
import { MemberEbookCard, MemberEbookCover } from "./ebook-card";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("id-ID", { hour: "numeric", hour12: false, timeZone: "Asia/Jakarta" }).format(new Date()));
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 19) return "Selamat sore";
  return "Selamat malam";
}

export interface MemberDashboardData {
  displayName: string;
  library: MemberEbook[];
  orders: MemberOrder[];
  courses: MemberCourse[];
  memberships: MemberMembership[];
  schedule: { bookings: MemberBooking[]; tickets: MemberTicket[] };
}

export function MemberDashboardView({ displayName, library, orders, courses, memberships, schedule }: MemberDashboardData) {
  const owned = library.filter((e) => e.is_owned);
  const locked = library.filter((e) => !e.is_owned);
  const recent = owned.filter((e) => e.last_read_at).slice(0, 5);
  const current = recent[0];
  const others = owned.filter((e) => e.id !== current?.id);
  const shelf = (others.length ? others : owned).slice(0, 4);
  const activeMemberships = memberships.filter((m) => m.status === "active");
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = [
    ...schedule.bookings
      .filter((b) => b.booking_date >= today && b.status !== "cancelled")
      .map((b) => ({ id: b.id, title: b.product_title, when: `${formatDateID(b.booking_date)} · ${b.start_time} WIB`, kind: "1-on-1" })),
    ...schedule.tickets
      .filter((t) => !t.event_date || t.event_date.slice(0, 10) >= today)
      .map((t) => ({ id: t.id, title: t.product_title, when: t.event_date ? formatDateID(t.event_date) : "Jadwal menyusul", kind: t.ticket_code })),
  ].slice(0, 3);

  const stats = [
    { label: "Ebook saya", value: owned.length, icon: BookOpen, href: "/member/ebooks", tone: "bg-[#cffafe]" },
    { label: "Kelas", value: courses.length, icon: GraduationCap, href: "/member/kelas", tone: "bg-[#f3e8ff]" },
    { label: "Membership aktif", value: activeMemberships.length, icon: Crown, href: "/member/membership", tone: "bg-[#fef9c3]" },
    { label: "Pesanan", value: orders.length >= 5 ? "5+" : orders.length, icon: ShoppingBag, href: "/member/pesanan", tone: "bg-[#ffe4e6]" },
  ];

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-bold text-[#7e22ce]">{greeting()},</p>
        <h1 className="text-2xl font-extrabold text-[#0f172a] sm:text-3xl">
          {displayName}
        </h1>
        <p className="mt-1 text-sm font-medium text-[#475569]">Semua ebook, kelas, dan pesanan Anda ada di sini.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href} className="group">
              <Card className="p-4 transition-transform group-hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg border-2 border-[#0f172a]", s.tone)}>
                    <Icon className="h-4 w-4 text-[#0f172a]" />
                  </span>
                  <ArrowRight className="h-4 w-4 text-[#94a3b8] transition-colors group-hover:text-[#0f172a]" />
                </div>
                <p className="mt-3 text-2xl font-black text-[#0f172a]">{s.value}</p>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#475569]">{s.label}</p>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {/* Continue reading */}
          {current ? (
            <Card className="overflow-hidden">
              <div className="flex flex-col gap-5 bg-[#ecfeff] p-5 sm:flex-row sm:items-center">
                <MemberEbookCover ebook={current} priority className="w-28 shrink-0 shadow-[3px_3px_0px_#0f172a] sm:w-32" />
                <div className="min-w-0 flex-1 space-y-3">
                  <Badge variant="info">Lanjutkan membaca</Badge>
                  <div>
                    <h2 className="line-clamp-2 text-lg font-extrabold text-[#0f172a]">{current.title}</h2>
                    {current.author && <p className="text-xs font-semibold text-[#475569]">{current.author}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-[#334155]">
                      <span>
                        Halaman {current.last_page}
                        {current.total_pages ? ` dari ${current.total_pages}` : ""}
                      </span>
                      <span className="text-[#0e7490]">{ebookProgressPct(current)}%</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-md border-2 border-[#0f172a] bg-white">
                      <div className="h-full bg-[#22d3ee]" style={{ width: `${ebookProgressPct(current)}%` }} />
                    </div>
                  </div>
                  <Link
                    href={`/member/baca/${current.id}`}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border-2 border-[#0f172a] bg-[#a855f7] px-4 text-sm font-extrabold text-white shadow-[3px_3px_0px_#0f172a] hover:bg-[#9333ea]"
                  >
                    <BookOpen className="h-4 w-4" />
                    Lanjut baca
                  </Link>
                </div>
              </div>
            </Card>
          ) : owned.length > 0 ? (
            <Card className="flex items-center gap-4 bg-[#ecfeff] p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#0f172a] bg-[#22d3ee]">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-[#0f172a]">Anda punya {owned.length} ebook yang siap dibaca</p>
                <p className="text-xs font-medium text-[#475569]">Progres baca tersimpan otomatis, lanjutkan kapan saja.</p>
              </div>
              <Link href={`/member/baca/${owned[0].id}`} className="hidden shrink-0 rounded-lg border-2 border-[#0f172a] bg-white px-3 py-2 text-xs font-extrabold shadow-[2px_2px_0px_#0f172a] sm:inline-flex">
                Mulai baca
              </Link>
            </Card>
          ) : null}

          {/* My ebooks */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[#0f172a]">Ebook Saya</h2>
              <Link href="/member/ebooks" className="inline-flex items-center gap-1 text-xs font-extrabold text-[#7e22ce] hover:underline">
                Lihat semua <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {owned.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="h-5 w-5" />}
                title="Belum ada ebook"
                description="Ebook yang Anda beli akan langsung muncul di sini dan bisa dibaca dari HP maupun laptop."
              />
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 xl:grid-cols-4">
                {shelf.map((e) => (
                  <MemberEbookCard key={e.id} ebook={e} />
                ))}
              </div>
            )}
          </section>

          {/* Locked teaser */}
          {locked.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="inline-flex items-center gap-2 text-lg font-extrabold text-[#0f172a]">
                  <Lock className="h-4 w-4" /> Koleksi Lainnya
                </h2>
                <Link href="/member/ebooks" className="inline-flex items-center gap-1 text-xs font-extrabold text-[#7e22ce] hover:underline">
                  {locked.length} terkunci <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 xl:grid-cols-4">
                {locked.slice(0, 4).map((e) => (
                  <MemberEbookCard key={e.id} ebook={e} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 text-sm font-extrabold text-[#0f172a]">
                <CalendarClock className="h-4 w-4" /> Jadwal Terdekat
              </h2>
              <Link href="/member/jadwal" className="text-[11px] font-extrabold text-[#7e22ce] hover:underline">
                Semua
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-xs font-medium text-[#475569]">Tidak ada jadwal sesi atau webinar mendatang.</p>
            ) : (
              <ul className="space-y-2.5">
                {upcoming.map((u) => (
                  <li key={u.id} className="rounded-xl border-2 border-[#0f172a] bg-[#f8fafc] p-3">
                    <p className="truncate text-xs font-extrabold text-[#0f172a]">{u.title}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-[#475569]">{u.when}</p>
                    <p className="mt-1 font-mono text-[10px] font-extrabold text-[#7e22ce]">{u.kind}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 text-sm font-extrabold text-[#0f172a]">
                <ShoppingBag className="h-4 w-4" /> Pesanan Terbaru
              </h2>
              <Link href="/member/pesanan" className="text-[11px] font-extrabold text-[#7e22ce] hover:underline">
                Semua
              </Link>
            </div>
            {orders.length === 0 ? (
              <p className="text-xs font-medium text-[#475569]">Belum ada pesanan.</p>
            ) : (
              <ul className="divide-y-2 divide-[#0f172a]/10">
                {orders.slice(0, 4).map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-extrabold text-[#0f172a]">{o.items[0] ?? o.order_number}</p>
                      <p className="text-[11px] font-semibold text-[#475569]">{formatDateID(o.created_at)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-extrabold text-[#0f172a]">{formatIDR(o.total_amount)}</p>
                      <span
                        className={cn(
                          "text-[10px] font-black uppercase",
                          o.payment_status === "paid" ? "text-[#0e7490]" : "text-[#b45309]"
                        )}
                      >
                        {o.payment_status === "paid" ? "Lunas" : o.payment_status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {activeMemberships.length > 0 && (
            <Card className="bg-[#f3e8ff] p-5">
              <h2 className="inline-flex items-center gap-2 text-sm font-extrabold text-[#0f172a]">
                <Crown className="h-4 w-4" /> Membership Aktif
              </h2>
              <ul className="mt-3 space-y-2">
                {activeMemberships.map((m) => (
                  <li key={m.id} className="text-xs font-bold text-[#0f172a]">
                    {m.product_title}
                    <span className="block text-[11px] font-semibold text-[#475569]">s/d {formatDateID(m.expires_at)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
