"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  Copy,
  Link2,
  MousePointerClick,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import type { Affiliate, Product } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, Card } from "@/components/ui/controls";
import { CustomModal } from "@/components/ui/custom-modal";
import { useToast } from "@/components/ui/custom-toast";
import { formatIDR } from "@/lib/utils";

export function AffiliateDashboardClient({
  affiliate,
  products,
  isDemoMode,
}: {
  affiliate: Affiliate;
  products: Product[];
  isDemoMode: boolean;
}) {
  const { toast } = useToast();
  const [payoutOpen, setPayoutOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [bankName, setBankName] = React.useState("BCA");
  const [accountNumber, setAccountNumber] = React.useState("");
  const [accountHolder, setAccountHolder] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const availableBalance = Math.max(0, Number(affiliate.total_earned) - Number(affiliate.total_paid_out));
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  async function copyLink(path: string) {
    const full = `${origin}${path}?ref=${affiliate.referral_code}`;
    try {
      await navigator.clipboard.writeText(full);
      toast({ type: "success", title: "Link referral disalin", description: full });
    } catch {
      toast({ type: "info", title: full });
    }
  }

  async function handleRequestPayout() {
    const numAmount = Number(amount);
    if (!numAmount || numAmount < 50000 || numAmount > availableBalance) {
      toast({
        type: "error",
        title: "Nominal pencairan tidak valid",
        description: `Minimal Rp50.000 dan maksimal ${formatIDR(availableBalance)}`,
      });
      return;
    }

    if (isDemoMode) {
      setPayoutOpen(false);
      toast({ type: "success", title: "Permintaan payout dicatat (Mode Pratinjau)" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/affiliate/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          bank_name: bankName,
          bank_account_number: accountNumber,
          bank_account_holder: accountHolder,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ type: "error", title: "Gagal mengajukan pencairan", description: json.error });
        return;
      }
      setPayoutOpen(false);
      toast({ type: "success", title: "Permintaan pencairan berhasil dikirim ke Owner" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
      <header className="sticky top-0 z-20 border-b border-[#e2e8f0] bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#475569] hover:text-[#0f172a]"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Storefront
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="success">Kode: {affiliate.referral_code}</Badge>
            <Link href="/portal" className="text-xs font-semibold text-[#059669] hover:underline">
              Buyer Portal
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[#0f172a]">Dashboard Affiliate Partner</h1>
            <p className="mt-1 text-sm text-[#64748b]">
              Bagikan tautan referral Anda dan dapatkan komisi otomatis setiap penjualan lunas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => copyLink("/")}>
              <Link2 className="h-4 w-4" />
              Salin Link Bio Referral
            </Button>
            <Button onClick={() => setPayoutOpen(true)}>
              <Wallet className="h-4 w-4" />
              Ajukan Pencairan
            </Button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#64748b]">
              <span>Saldo Tersedia</span>
              <Wallet className="h-4 w-4 text-[#059669]" />
            </div>
            <p className="mt-2.5 text-2xl font-extrabold text-[#059669]">
              {formatIDR(availableBalance)}
            </p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#64748b]">
              <span>Total Komisi Diraih</span>
              <Banknote className="h-4 w-4 text-[#2563eb]" />
            </div>
            <p className="mt-2.5 text-2xl font-extrabold text-[#0f172a]">
              {formatIDR(Number(affiliate.total_earned))}
            </p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#64748b]">
              <span>Total Konversi</span>
              <ShoppingCart className="h-4 w-4 text-[#d97706]" />
            </div>
            <p className="mt-2.5 text-2xl font-extrabold text-[#0f172a]">
              {affiliate.total_conversions} Order
            </p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#64748b]">
              <span>Total Klik Link</span>
              <MousePointerClick className="h-4 w-4 text-[#7e22ce]" />
            </div>
            <p className="mt-2.5 text-2xl font-extrabold text-[#0f172a]">
              {affiliate.total_clicks} Klik
            </p>
          </Card>
        </div>

        {/* Promotable Products */}
        <Card className="overflow-hidden">
          <div className="border-b border-[#e2e8f0] px-6 py-4">
            <h2 className="text-sm font-bold text-[#0f172a]">
              Katalog Produk Ber-Komisi Affiliate
            </h2>
            <p className="text-xs text-[#64748b]">
              Klik tombol salin untuk mendapatkan link produk dengan cookie atribusi 30 hari.
            </p>
          </div>
          <div className="divide-y divide-[#e2e8f0]">
            {products
              .filter((p) => p.affiliate_enabled)
              .map((p) => {
                const estCommission = Math.floor(
                  (Number(p.price) * Number(p.affiliate_commission_pct)) / 100
                );
                return (
                  <div
                    key={p.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 hover:bg-[#f8fafc]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0f172a]">{p.title}</p>
                      <p className="mt-0.5 text-xs text-[#64748b]">
                        Harga {formatIDR(p.price)} · Komisi{" "}
                        <span className="font-bold text-[#059669]">
                          {p.affiliate_commission_pct}% ({formatIDR(estCommission)}/penjualan)
                        </span>
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyLink(`/p/${p.slug}`)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Salin Link Produk
                    </Button>
                  </div>
                );
              })}
          </div>
        </Card>
      </main>

      <CustomModal
        open={payoutOpen}
        onClose={() => setPayoutOpen(false)}
        title="Ajukan Pencairan Komisi (Payout)"
        description={`Saldo tersedia: ${formatIDR(availableBalance)}`}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setPayoutOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleRequestPayout} isLoading={submitting}>
              Kirim Permintaan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nominal Pencairan (IDR)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Minimal 50000"
          />
          <Input
            label="Nama Bank / E-Wallet"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="BCA / Mandiri / GoPay / DANA"
          />
          <Input
            label="Nomor Rekening / Nomor HP"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
          />
          <Input
            label="Nama Pemilik Rekening"
            value={accountHolder}
            onChange={(e) => setAccountHolder(e.target.value)}
          />
        </div>
      </CustomModal>
    </div>
  );
}
