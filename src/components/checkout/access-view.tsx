import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  Download,
  ExternalLink,
  KeyRound,
  MapPin,
  PackageCheck,
  Ticket,
  Video,
} from "lucide-react";
import type { AccessItem, OrderAccessData } from "@/lib/order-access-data";
import { formatDateTimeID } from "@/lib/utils";
import { Card } from "@/components/ui/controls";
import { PRODUCT_TYPE_META, ProductTypeIcon } from "@/components/storefront/product-type-meta";

const BTN =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border-2 border-[#0f172a] px-4 text-xs font-extrabold shadow-[3px_3px_0px_#0f172a] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#0f172a]";

const SHIPPING_LABEL: Record<string, string> = {
  processing: "Sedang dikemas",
  shipped: "Dalam pengiriman",
  delivered: "Sudah diterima",
};

function EbookAccess({ item }: { item: AccessItem }) {
  if (item.ebooks.length === 0) return null;
  return (
    <div className="space-y-2.5 rounded-xl border-2 border-[#0f172a] bg-[#ecfeff] p-3">
      <p className="flex items-center gap-2 text-xs font-extrabold text-[#0f172a]">
        <BookOpen className="h-4 w-4" /> {item.ebooks.length} ebook siap dibaca di Member Area
      </p>
      <ul className="space-y-0.5 text-xs font-bold text-[#334155]">
        {item.ebooks.slice(0, 5).map((e) => (
          <li key={e.id} className="truncate">• {e.title}</li>
        ))}
        {item.ebooks.length > 5 && <li>+{item.ebooks.length - 5} lainnya</li>}
      </ul>
      <p className="text-[11px] font-medium text-[#475569]">
        Masuk atau daftar dengan email pembelian ini. Ebook dibaca langsung di browser dan progresnya tersimpan.
      </p>
      <Link href="/member/ebooks" className={`${BTN} bg-[#a855f7] text-white hover:bg-[#9333ea]`}>
        Baca Ebook <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function ItemBody({ item, token }: { item: AccessItem; token: string }) {
  const dl = (id: string) => `/api/access/${encodeURIComponent(token)}/download/${id}`;

  switch (item.type) {
    case "digital":
      return (
        <div className="space-y-2">
          <EbookAccess item={item} />
          {item.assets.length === 0 && item.ebooks.length === 0 && (
            <p className="text-xs font-medium text-[#475569]">
              {item.deliveryNote || "File sedang disiapkan kreator. Kami kabari lewat email setelah siap."}
            </p>
          )}
          {item.assets.map((a) =>
            a.kind === "license_key" ? (
              <div key={a.id} className="rounded-xl border-2 border-[#0f172a] bg-[#f4f8fb] p-3">
                <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#475569]">
                  <KeyRound className="h-3.5 w-3.5" /> {a.title}
                </span>
                <span className="mt-1 block font-mono text-sm font-black break-all text-[#0f172a]">
                  {a.licenseKey ?? "-"}
                </span>
              </div>
            ) : (
              <a
                key={a.id}
                href={dl(a.id)}
                rel="noopener noreferrer"
                target={a.kind === "external_url" ? "_blank" : undefined}
                className={`${BTN} w-full justify-between bg-white text-[#0f172a] hover:bg-[#ecfeff]`}
              >
                <span className="truncate">{a.title}</span>
                {a.kind === "external_url" ? (
                  <ExternalLink className="h-4 w-4 shrink-0" />
                ) : (
                  <Download className="h-4 w-4 shrink-0" />
                )}
              </a>
            )
          )}
          {item.deliveryNote && item.assets.length > 0 && (
            <p className="text-[11px] font-medium text-[#475569]">{item.deliveryNote}</p>
          )}
        </div>
      );
    case "course":
      return (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#475569]">
            Masuk atau daftar dengan email pembelian ini untuk mulai belajar dan menyimpan progres.
          </p>
          <Link
            href={item.courseSlug ? `/portal/course/${item.courseSlug}` : "/member"}
            className={`${BTN} bg-[#a855f7] text-white hover:bg-[#9333ea]`}
          >
            Mulai Belajar <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      );
    case "appointment":
      return item.booking ? (
        <div className="space-y-2.5">
          <p className="flex items-center gap-2 text-sm font-extrabold text-[#0f172a]">
            <CalendarClock className="h-4 w-4" />
            {new Date(`${item.booking.date}T00:00:00`).toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            , {item.booking.start}–{item.booking.end} WIB
          </p>
          {item.booking.meetingLink ? (
            <a
              href={item.booking.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`${BTN} bg-[#22d3ee] text-[#0f172a] hover:bg-[#06b6d4]`}
            >
              <Video className="h-4 w-4" /> Link Meeting
            </a>
          ) : (
            <p className="text-xs font-medium text-[#475569]">
              Link meeting akan dikirim kreator sebelum sesi dimulai.
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs font-medium text-[#475569]">Jadwal sedang dikonfirmasi.</p>
      );
    case "event":
      return (
        <div className="space-y-2.5">
          {item.tickets.map((t) => (
            <div
              key={t.code}
              className="flex items-center justify-between gap-3 rounded-xl border-2 border-dashed border-[#0f172a] bg-[#faf5ff] p-3"
            >
              <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-[#7e22ce]">
                <Ticket className="h-4 w-4" /> E-Tiket
              </span>
              <span className="font-mono text-base font-black tracking-wider text-[#0f172a]">
                {t.code}
              </span>
            </div>
          ))}
          {item.event?.date && (
            <p className="flex items-center gap-2 text-xs font-bold text-[#0f172a]">
              <CalendarClock className="h-4 w-4" /> {formatDateTimeID(item.event.date)}
            </p>
          )}
          {item.event?.location && (
            <p className="flex items-center gap-2 text-xs font-bold text-[#0f172a]">
              <MapPin className="h-4 w-4" /> {item.event.location}
            </p>
          )}
          {item.event?.meetingUrl && (
            <a
              href={item.event.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${BTN} bg-[#22d3ee] text-[#0f172a] hover:bg-[#06b6d4]`}
            >
              <Video className="h-4 w-4" /> Gabung Event
            </a>
          )}
        </div>
      );
    case "membership":
      return (
        <div className="space-y-2.5">
          <EbookAccess item={item} />
          {item.membership?.expiresAt && (
            <p className="text-xs font-bold text-[#0f172a]">
              Aktif sampai {formatDateTimeID(item.membership.expiresAt)}
            </p>
          )}
          {item.membership?.communityLink ? (
            <a
              href={item.membership.communityLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`${BTN} bg-[#22d3ee] text-[#0f172a] hover:bg-[#06b6d4]`}
            >
              Masuk Komunitas <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <p className="text-xs font-medium text-[#475569]">
              Konten member bisa dibuka lewat Member Area.
            </p>
          )}
        </div>
      );
    case "physical":
      return (
        <div className="space-y-1 text-xs font-medium text-[#334155]">
          <p className="flex items-center gap-2 text-sm font-extrabold text-[#0f172a]">
            <PackageCheck className="h-4 w-4" />
            {SHIPPING_LABEL[item.shipping?.status ?? "processing"] ?? "Sedang diproses"}
          </p>
          {item.shipping?.courier && <p>Kurir: {item.shipping.courier}</p>}
          {item.shipping?.tracking && (
            <p>
              No. resi: <span className="font-mono font-extrabold">{item.shipping.tracking}</span>
            </p>
          )}
        </div>
      );
    case "donation":
      return (
        <p className="text-xs font-medium text-[#475569]">
          Dukunganmu sudah diterima kreator. Terima kasih banyak!
        </p>
      );
  }
}

export function AccessView({ data, token }: { data: OrderAccessData; token: string }) {
  return (
    <div className="min-h-screen px-4 py-8 sm:py-12 flex justify-center">
      <div className="w-full max-w-lg space-y-4">
        <Card className="p-5 sm:p-7">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0e7490]">
            Akses Produk
          </span>
          <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-[#0f172a]">
            Halo {data.buyerName.split(" ")[0]}, produkmu siap!
          </h1>
          <p className="mt-1 text-xs font-medium text-[#475569]">
            Pesanan <span className="font-mono font-extrabold text-[#0f172a]">{data.orderNumber}</span>
            {data.paidAt && <> · dibayar {formatDateTimeID(data.paidAt)}</>}
          </p>
        </Card>

        {data.items.map((item) => {
          const meta = PRODUCT_TYPE_META[item.type];
          return (
            <Card key={item.productId} className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#0f172a] shadow-[2px_2px_0px_#0f172a] ${meta.accentBg} ${meta.accentText}`}
                >
                  <ProductTypeIcon type={item.type} className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold leading-snug text-[#0f172a]">{item.title}</p>
                  <p className="text-[11px] font-bold text-[#475569]">{meta.label}</p>
                </div>
              </div>
              <ItemBody item={item} token={token} />
            </Card>
          );
        })}

        <Card className="p-4 text-xs font-medium text-[#334155]">
          Mau semua pembelian tersimpan di satu tempat? Daftar dengan email{" "}
          <span className="font-extrabold text-[#0f172a] break-all">{data.buyerEmail}</span>, pesanan ini
          otomatis masuk ke{" "}
          <Link href="/member" className="font-extrabold text-[#7e22ce] underline underline-offset-2">
            Member Area
          </Link>
          .
        </Card>
      </div>
    </div>
  );
}
