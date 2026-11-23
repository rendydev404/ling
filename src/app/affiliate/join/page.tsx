"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/controls";
import { useToast } from "@/components/ui/custom-toast";

export default function AffiliateJoinPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [customCode, setCustomCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/affiliate/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode: customCode.trim().toUpperCase() || undefined }),
      });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/register");
        return;
      }
      if (!res.ok) {
        toast({ type: "error", title: "Pendaftaran gagal", description: json.error });
        return;
      }
      toast({ type: "success", title: "Selamat bergabung sebagai Affiliate Partner!" });
      router.push("/affiliate");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-md space-y-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#475569] hover:text-[#0f172a]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke Storefront
        </Link>

        <Card className="p-6 sm:p-7 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#059669] text-white">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-[#0f172a]">
                Program Affiliate Partner
              </h1>
              <p className="text-xs text-[#64748b]">
                Dapatkan komisi hingga 30% dari setiap transaksi via link Anda.
              </p>
            </div>
          </div>

          <ul className="space-y-2 text-xs text-[#334155]">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#059669] shrink-0" />
              Cookie atribusi 30 hari otomatis pada setiap kunjungan
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#059669] shrink-0" />
              Dashboard pelacakan klik, konversi, dan saldo real-time
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#059669] shrink-0" />
              Pencairan komisi langsung ke rekening bank atau e-wallet Anda
            </li>
          </ul>

          <form onSubmit={handleJoin} className="space-y-4">
            <Input
              label="Kode Referral Pilihan (Opsional)"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              placeholder="Contoh: BUDI2026"
              helperText="Kosongkan untuk generate kode otomatis."
            />
            <Button type="submit" size="lg" className="w-full" isLoading={loading}>
              Aktifkan Akun Affiliate
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
