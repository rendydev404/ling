"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  Smartphone,
  Timer,
  TriangleAlert,
} from "lucide-react";
import { PAYMENT_METHODS, type PaymentInstructions } from "@/lib/payment-methods";
import { formatIDR } from "@/lib/utils";
import { PaymentMethodChip } from "@/components/checkout/payment-method-picker";

const POLL_MS = 4000;
/** Every Nth poll also asks Midtrans directly (covers environments where the webhook can't reach us) */
const LIVE_EVERY = 3;

function bankName(bank?: string) {
  if (!bank) return "bank";
  if (bank === "cimb") return "CIMB Niaga";
  if (bank === "mandiri") return "Mandiri";
  if (bank === "permata") return "Permata";
  return bank.toUpperCase();
}

function getSteps(ins: PaymentInstructions): string[] {
  switch (ins.method) {
    case "qris":
      return [
        "Buka aplikasi m-banking atau e-wallet (GoPay, OVO, DANA, ShopeePay, LinkAja, dll).",
        "Pilih menu Scan / Bayar QRIS, lalu scan kode QR di atas.",
        "Periksa nominal, lalu konfirmasi pembayaran.",
      ];
    case "gopay":
      return [
        "Di HP: tekan tombol Bayar di GoPay, aplikasi Gojek akan terbuka.",
        "Di laptop: buka aplikasi Gojek, pilih Bayar, lalu scan kode QR.",
        "Periksa nominal, lalu masukkan PIN GoPay.",
      ];
    case "shopeepay":
      return [
        "Buka halaman ini di HP yang terpasang aplikasi Shopee.",
        "Tekan tombol Bayar di ShopeePay, aplikasi Shopee akan terbuka.",
        "Periksa nominal, lalu masukkan PIN ShopeePay.",
      ];
    case "mandiri_bill":
      return [
        "Buka Livin' by Mandiri, pilih Bayar lalu E-Commerce / Multipayment.",
        `Masukkan kode perusahaan ${ins.billerCode ?? "-"} dan kode bayar di atas.`,
        "Periksa nominal, lalu konfirmasi dengan PIN.",
      ];
    default:
      return [
        `Buka m-banking ${bankName(ins.bank)} atau ATM terdekat.`,
        "Pilih Transfer, lalu Virtual Account.",
        "Masukkan nomor Virtual Account di atas, pastikan nominal sesuai, lalu konfirmasi.",
        "Dari bank lain? Pilih transfer antar bank dan masukkan nomor VA yang sama.",
      ];
  }
}

function useCountdown(expiresAt: string | null) {
  const target = expiresAt ? Date.parse(expiresAt) : NaN;
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (Number.isNaN(target)) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [target]);
  if (Number.isNaN(target)) return { remainingMs: null, expired: false };
  const remainingMs = Math.max(0, target - now);
  return { remainingMs, expired: remainingMs === 0 };
}

function formatRemaining(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        } catch {
          // clipboard blocked; user can still select the text
        }
      }}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border-2 border-[#0f172a] bg-white px-3 text-xs font-extrabold text-[#0f172a] shadow-[2px_2px_0px_#0f172a] transition-all hover:bg-[#ecfeff] active:translate-x-px active:translate-y-px active:shadow-none cursor-pointer"
      aria-label={label}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-[#0e7490]" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Tersalin" : "Salin"}
    </button>
  );
}

function CodeRow({ caption, value }: { caption: string; value: string }) {
  return (
    <div className="rounded-xl border-2 border-[#0f172a] bg-white p-3.5 shadow-[3px_3px_0px_#0f172a]">
      <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[#475569]">
        {caption}
      </span>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="font-mono text-lg sm:text-xl font-black tracking-wider text-[#0f172a] break-all">
          {value}
        </span>
        <CopyButton value={value} label={`Salin ${caption}`} />
      </div>
    </div>
  );
}

export function PaymentPanel({
  orderNumber,
  totalAmount,
  instructions,
  qrSvg,
}: {
  orderNumber: string;
  totalAmount: number;
  instructions: PaymentInstructions;
  qrSvg: string | null;
}) {
  const router = useRouter();
  const meta = PAYMENT_METHODS[instructions.method];
  const { remainingMs, expired } = useCountdown(instructions.expiresAt);
  const [checking, setChecking] = React.useState(false);
  const [lastCheckNote, setLastCheckNote] = React.useState<string | null>(null);

  const checkStatus = React.useCallback(
    async (live: boolean) => {
      try {
        const res = await fetch(
          `/api/orders/${encodeURIComponent(orderNumber)}/status${live ? "?live=1" : ""}`,
          { cache: "no-store" }
        );
        if (!res.ok) return null;
        const json = (await res.json()) as { status?: string };
        if (json.status && json.status !== "pending") {
          router.refresh();
        }
        return json.status ?? null;
      } catch {
        return null;
      }
    },
    [orderNumber, router]
  );

  // Poll while the tab is visible and the payment window is still open
  React.useEffect(() => {
    if (expired) return;
    let tick = 0;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      tick += 1;
      void checkStatus(tick % LIVE_EVERY === 0);
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkStatus(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [checkStatus, expired]);

  async function handleManualCheck() {
    setChecking(true);
    const status = await checkStatus(true);
    setChecking(false);
    if (status === "pending") setLastCheckNote("Pembayaran belum kami terima. Coba lagi sebentar.");
  }

  function handleDownloadQr() {
    if (!qrSvg) return;
    const url = URL.createObjectURL(new Blob([qrSvg], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `QRIS-${orderNumber}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (expired) {
    return (
      <div className="rounded-2xl border-2 border-[#0f172a] bg-[#ffe4e6] p-5 text-left shadow-[4px_4px_0px_#0f172a]">
        <div className="flex items-center gap-2 text-sm font-extrabold text-[#0f172a]">
          <TriangleAlert className="h-5 w-5" />
          Waktu pembayaran sudah habis
        </div>
        <p className="mt-1.5 text-xs font-medium text-[#334155]">
          Kode pembayaran ini tidak bisa dipakai lagi. Silakan buat pesanan baru dari halaman produk.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border-2 border-[#0f172a] bg-white px-4 text-xs font-extrabold text-[#0f172a] shadow-[3px_3px_0px_#0f172a] hover:bg-[#ecfeff]"
        >
          Kembali ke Storefront
        </Link>
      </div>
    );
  }

  const isWallet = instructions.group === "ewallet";
  const qrImageAllowed =
    !qrSvg &&
    instructions.qrImageUrl &&
    /^https:\/\/api(\.sandbox)?\.midtrans\.com\//.test(instructions.qrImageUrl);

  return (
    <div className="space-y-4 text-left">
      {instructions.isSimulated && (
        <p className="rounded-lg border-2 border-dashed border-[#0f172a] bg-[#fef9c3] px-3 py-2 text-[11px] font-bold text-[#713f12]">
          Mode simulasi: server key Midtrans belum diatur, kode di bawah hanya contoh.
        </p>
      )}

      {/* Amount + countdown */}
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] items-stretch gap-3">
        <div className="min-w-0 rounded-xl border-2 border-[#0f172a] bg-[#67e8f9] p-3.5 shadow-[3px_3px_0px_#0f172a]">
          <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[#0f172a]/70">
            Total Bayar
          </span>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <span className="text-xl sm:text-2xl font-black text-[#0f172a]">
              {formatIDR(totalAmount)}
            </span>
            <CopyButton value={String(Math.round(totalAmount))} label="Salin nominal" />
          </div>
        </div>
        {remainingMs !== null && (
          <div className="rounded-xl border-2 border-[#0f172a] bg-[#fde047] p-3.5 shadow-[3px_3px_0px_#0f172a]">
            <span className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#0f172a]/70">
              <Timer className="h-3.5 w-3.5" /> Bayar Dalam
            </span>
            <span className="mt-0.5 block font-mono text-xl sm:text-2xl font-black tabular-nums text-[#0f172a]">
              {formatRemaining(remainingMs)}
            </span>
          </div>
        )}
      </div>

      {/* Method header */}
      <div className="flex items-center gap-2.5">
        <PaymentMethodChip code={instructions.method} />
        <span className="text-sm font-extrabold text-[#0f172a]">{meta.label}</span>
      </div>

      {/* Method specific block */}
      {(qrSvg || qrImageAllowed) && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-[#0f172a] bg-white p-4 shadow-[4px_4px_0px_#0f172a]">
          {qrSvg ? (
            <div
              className="w-full max-w-[260px] aspect-square [&>svg]:h-full [&>svg]:w-full"
              aria-label="Kode QR pembayaran"
              role="img"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={instructions.qrImageUrl}
              alt="Kode QR pembayaran"
              width={260}
              height={260}
              className="h-[260px] w-[260px]"
            />
          )}
          {instructions.method === "qris" && (
            <span className="text-[11px] font-bold text-[#475569]">
              Bisa dibayar dengan semua aplikasi yang mendukung QRIS
            </span>
          )}
          {qrSvg && (
            <button
              type="button"
              onClick={handleDownloadQr}
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#0f172a] underline decoration-2 underline-offset-4 hover:text-[#7e22ce] cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Simpan Kode QR
            </button>
          )}
        </div>
      )}

      {instructions.vaNumber && (
        <CodeRow
          caption={`Nomor Virtual Account ${bankName(instructions.bank)}`}
          value={instructions.vaNumber}
        />
      )}

      {instructions.method === "mandiri_bill" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
          {instructions.billerCode && (
            <CodeRow caption="Kode Perusahaan" value={instructions.billerCode} />
          )}
          {instructions.billKey && <CodeRow caption="Kode Bayar" value={instructions.billKey} />}
        </div>
      )}

      {isWallet && (
        instructions.deeplinkUrl ? (
          <a
            href={instructions.deeplinkUrl}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#0f172a] bg-[#22d3ee] px-4 text-sm font-extrabold text-[#0f172a] shadow-[3px_3px_0px_#0f172a] transition-all hover:bg-[#06b6d4] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#0f172a]"
          >
            <Smartphone className="h-4 w-4" />
            Bayar di {meta.label}
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          <div className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#0f172a] bg-[#f8fafc] px-4 text-xs font-extrabold text-[#475569]">
            <Smartphone className="h-4 w-4" />
            Tombol Bayar di {meta.label} muncul saat Midtrans aktif
          </div>
        )
      )}

      {/* Steps */}
      <div className="rounded-xl border-2 border-[#0f172a] bg-[#f4f8fb] p-4 shadow-[3px_3px_0px_#0f172a]">
        <span className="block text-xs font-extrabold text-[#0f172a]">Cara Bayar</span>
        <ol className="mt-2.5 space-y-2">
          {getSteps(instructions).map((step, i) => (
            <li key={i} className="flex gap-2.5 text-xs font-medium leading-relaxed text-[#334155]">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-[#0f172a] bg-white text-[10px] font-black text-[#0f172a]">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Live status */}
      <div className="flex flex-col items-center gap-2 pt-1">
        <span className="inline-flex items-center gap-2 text-[11px] font-bold text-[#475569]">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0891b2]" />
          Halaman ini otomatis ter-update setelah pembayaran diterima
        </span>
        <button
          type="button"
          onClick={handleManualCheck}
          disabled={checking}
          className="inline-flex h-10 items-center gap-2 rounded-xl border-2 border-[#0f172a] bg-white px-4 text-xs font-extrabold text-[#0f172a] shadow-[3px_3px_0px_#0f172a] transition-all hover:bg-[#ecfeff] disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
          Saya Sudah Bayar, Cek Status
        </button>
        {lastCheckNote && (
          <span className="text-[11px] font-bold text-[#b45309]">{lastCheckNote}</span>
        )}
      </div>
    </div>
  );
}
