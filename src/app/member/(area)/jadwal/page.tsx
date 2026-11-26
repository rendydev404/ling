import type { Metadata } from "next";
import { CalendarClock, ExternalLink, Ticket } from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ui/controls";
import { requireAuth } from "@/lib/supabase/auth";
import { getMemberSchedule } from "@/lib/member-data";
import { formatDateID, formatDateTimeID } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Jadwal & Tiket · Member Area", robots: { index: false } };

const linkCls =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border-2 border-[#0f172a] px-3.5 text-xs font-extrabold shadow-[2px_2px_0px_#0f172a]";

export default async function MemberSchedulePage() {
  const { user } = await requireAuth("/login?next=/member/jadwal");
  const { bookings, tickets } = await getMemberSchedule(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0f172a]">Jadwal & Tiket</h1>
        <p className="mt-1 text-sm font-medium text-[#475569]">Sesi konsultasi 1-on-1 dan e-ticket webinar Anda.</p>
      </div>

      {bookings.length === 0 && tickets.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="h-5 w-5" />}
          title="Belum ada jadwal atau tiket"
          description="Booking konsultasi 1-on-1 dan e-ticket webinar Anda akan tampil di sini."
        />
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <Card key={b.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="warning">1-on-1</Badge>
                  <Badge variant={b.status === "confirmed" ? "success" : "neutral"}>{b.status}</Badge>
                </div>
                <h3 className="mt-2 text-sm font-extrabold text-[#0f172a]">{b.product_title}</h3>
                <p className="mt-1 text-xs font-medium text-[#475569]">
                  {formatDateID(b.booking_date)} · {b.start_time} - {b.end_time} WIB
                </p>
              </div>
              {b.meeting_link && b.status === "confirmed" && (
                <a href={b.meeting_link} target="_blank" rel="noopener noreferrer" className={`${linkCls} bg-[#22d3ee] text-[#0f172a]`}>
                  Masuk Ruang Meeting <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </Card>
          ))}
          {tickets.map((t) => (
            <Card key={t.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="info">
                    <Ticket className="h-3 w-3" /> E-Ticket
                  </Badge>
                  <span className="rounded-md border border-[#0f172a] bg-[#cffafe] px-2 py-0.5 font-mono text-xs font-extrabold text-[#0f172a]">
                    {t.ticket_code}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-extrabold text-[#0f172a]">{t.product_title}</h3>
                <p className="mt-1 text-xs font-medium text-[#475569]">
                  {t.event_date ? formatDateTimeID(t.event_date) : "Jadwal terkonfirmasi"} · {t.event_location || "Online"}
                </p>
              </div>
              {t.event_meeting_url && (
                <a href={t.event_meeting_url} target="_blank" rel="noopener noreferrer" className={`${linkCls} bg-[#a855f7] text-white`}>
                  Link Acara <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
