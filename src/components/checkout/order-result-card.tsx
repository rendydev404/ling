import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  Receipt,
  RotateCcw,
  Undo2,
  XCircle,
} from "lucide-react";
import { formatDateTimeID, formatIDR } from "@/lib/utils";
import { Badge, Card } from "@/components/ui/controls";

type ResultKind = "paid" | "failed" | "refunded" | "pending";

const STATUS_LABEL: Record<string, string> = {
  paid: "LUNAS",
  pending: "MENUNGGU",
  expired: "KEDALUWARSA",
  cancelled: "DIBATALKAN",
  refunded: "DIKEMBALIKAN",
};

function kindOf(status: string): ResultKind {
  if (status === "paid") return "paid";
  if (status === "expired" || status === "cancelled") return "failed";
  if (status === "refunded") return "refunded";
  return "pending";
}

const PRIMARY_BTN =
  "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#0f172a] px-4 text-sm font-extrabold shadow-[3px_3px_0px_#0f172a] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#0f172a]";

export interface OrderResultCardProps {
  orderNumber: string;
  status: string;
  totalAmount: number;
  buyerName?: string | null;
  buyerEmail?: string | null;
  productTitle?: string | null;
  /** Slug of the main product, used for the "order again" button on failed payments */
  productSlug?: string | null;
  methodLabel?: string | null;
  createdAt?: string | null;
  paidAt?: string | null;
  /** Legacy Snap orders only */
  resumeUrl?: string | null;
  /** Signed access page, only passed for the browser that placed the order */
  accessUrl?: string | null;
}

export function OrderResultCard(props: OrderResultCardProps) {
  const kind = kindOf(props.status);
  const isExpired = props.status === "expired";

  const tone = {
    paid: { bg: "bg-[#22d3ee]", icon: <CheckCircle2 className="h-8 w-8" />, badge: "success" },
    failed: { bg: "bg-[#fda4af]", icon: <XCircle className="h-8 w-8" />, badge: "danger" },
    refunded: { bg: "bg-[#e9d5ff]", icon: <Undo2 className="h-8 w-8" />, badge: "warning" },
    pending: { bg: "bg-[#fde047]", icon: <Clock className="h-8 w-8" />, badge: "warning" },
  }[kind] as { bg: string; icon: React.ReactNode; badge: "success" | "danger" | "warning" };

  const title = {
    paid: "Pembayaran Berhasil!",
    failed: isExpired ? "Waktu Pembayaran Habis" : "Pembayaran Gagal",
    refunded: "Dana Sudah Dikembalikan",
    pending: "Menunggu Pembayaran",
  }[kind];

  const subtitle = {
    paid: "Terima kasih! Pembayaran kamu sudah terverifikasi otomatis dan pesanan sedang diproses.",
    failed: isExpired
      ? "Batas waktu pembayaran sudah lewat, jadi kode pembayaran tidak bisa dipakai lagi. Tenang, tidak ada dana yang terpotong."
      : "Transaksi dibatalkan atau ditolak oleh penyedia pembayaran. Tidak ada dana yang terpotong.",
    refunded: "Pembayaran untuk pesanan ini sudah dikembalikan ke metode pembayaran asal.",
    pending: "Pembayaran belum kami terima. Muat ulang halaman ini untuk memeriksa status terbaru.",
  }[kind];

  return (
    <div className="min-h-screen px-4 py-10 sm:py-14 flex justify-center">
      <div className="w-full max-w-lg space-y-4">
        <Card className="p-6 sm:p-8 text-center">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#0f172a] text-[#0f172a] shadow-[4px_4px_0px_#0f172a] ${tone.bg}`}
          >
            {tone.icon}
          </div>

          <h1 className="mt-5 text-2xl font-extrabold text-[#0f172a]">{title}</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-relaxed text-[#475569]">
            {subtitle}
          </p>

          {kind === "paid" && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border-2 border-[#0f172a] bg-[#ecfeff] p-3.5 text-left shadow-[3px_3px_0px_#0f172a]">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-white">
                <Mail className="h-4 w-4 text-[#0e7490]" />
              </span>
              <p className="text-xs font-medium leading-relaxed text-[#0f172a]">
                Akses & bukti pembayaran dikirim ke{" "}
                <span className="font-extrabold [overflow-wrap:anywhere]">
                  {props.buyerEmail || "email kamu"}
                </span>
                . Kamu juga bisa membuka produk kapan saja lewat Member Area.
              </p>
            </div>
          )}

          <div className="mt-6 rounded-xl border-2 border-[#0f172a] bg-[#f4f8fb] p-4 text-left space-y-2.5 text-xs shadow-[3px_3px_0px_#0f172a]">
            <div className="flex justify-between gap-3">
              <span className="text-[#475569] font-semibold inline-flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-[#0f172a]" /> Nomor Pesanan
              </span>
              <span className="font-mono font-extrabold text-[#0f172a]">{props.orderNumber}</span>
            </div>
            {props.productTitle && (
              <div className="flex justify-between gap-3">
                <span className="text-[#475569] font-semibold">Produk</span>
                <span className="font-bold text-[#0f172a] text-right max-w-[230px] truncate">
                  {props.productTitle}
                </span>
              </div>
            )}
            {props.buyerName && (
              <div className="flex justify-between gap-3">
                <span className="text-[#475569] font-semibold">Pembeli</span>
                <span className="font-bold text-[#0f172a] text-right">{props.buyerName}</span>
              </div>
            )}
            {props.methodLabel && (
              <div className="flex justify-between gap-3">
                <span className="text-[#475569] font-semibold">Metode Bayar</span>
                <span className="font-extrabold text-[#7e22ce] text-right">{props.methodLabel}</span>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <span className="text-[#475569] font-semibold">Total</span>
              <span className="font-extrabold text-[#0e7490]">{formatIDR(props.totalAmount)}</span>
            </div>
            <div className="flex justify-between items-center gap-3">
              <span className="text-[#475569] font-semibold">Status</span>
              <Badge variant={tone.badge}>
                {STATUS_LABEL[props.status] ?? props.status.toUpperCase()}
              </Badge>
            </div>
            {(kind === "paid" ? props.paidAt ?? props.createdAt : props.createdAt) && (
              <div className="flex justify-between gap-3">
                <span className="text-[#475569] font-semibold">
                  {kind === "paid" && props.paidAt ? "Dibayar" : "Dibuat"}
                </span>
                <span className="font-medium text-[#0f172a]">
                  {formatDateTimeID((kind === "paid" ? props.paidAt ?? props.createdAt : props.createdAt)!)}
                </span>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {kind === "failed" && (
              <Link
                href={props.productSlug ? `/checkout/${props.productSlug}` : "/"}
                className={`${PRIMARY_BTN} bg-[#22d3ee] text-[#0f172a] hover:bg-[#06b6d4]`}
              >
                <RotateCcw className="h-4 w-4" />
                Pesan Ulang
              </Link>
            )}
            {kind === "pending" && props.resumeUrl && (
              <a
                href={props.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${PRIMARY_BTN} bg-[#22d3ee] text-[#0f172a] hover:bg-[#06b6d4]`}
              >
                Lanjutkan Bayar
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {kind === "paid" && props.accessUrl && (
              <Link
                href={props.accessUrl}
                className={`${PRIMARY_BTN} bg-[#22d3ee] text-[#0f172a] hover:bg-[#06b6d4]`}
              >
                Buka Akses Produk
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            {kind !== "failed" && (
              <Link
                href="/member"
                className={`${PRIMARY_BTN} ${
                  kind === "paid" && props.accessUrl
                    ? "bg-white text-[#0f172a] hover:bg-[#f3e8ff]"
                    : "bg-[#a855f7] text-white hover:bg-[#9333ea]"
                }`}
              >
                Buka Member Area
                {!(kind === "paid" && props.accessUrl) && <ArrowRight className="h-4 w-4" />}
              </Link>
            )}
          </div>

          <Link
            href="/"
            className="mt-5 inline-block text-xs font-extrabold text-[#0f172a] underline decoration-2 underline-offset-4 hover:text-[#7e22ce]"
          >
            Kembali ke Storefront
          </Link>
        </Card>
      </div>
    </div>
  );
}
