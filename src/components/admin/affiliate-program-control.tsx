"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Users } from "lucide-react";
import { Badge, Card, CustomSwitch } from "@/components/ui/controls";
import { useToast } from "@/components/ui/custom-toast";

export function AffiliateProgramControl({
  initialEnabled,
}: {
  initialEnabled: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [enabled, setEnabled] = React.useState(initialEnabled);
  const [saving, setSaving] = React.useState(false);

  async function handleToggle(nextValue: boolean) {
    setEnabled(nextValue);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affiliate_program_enabled: nextValue }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setEnabled(!nextValue);
        toast({
          type: "error",
          title: "Gagal memperbarui status Affiliate",
          description: json.error || "Periksa koneksi database Supabase Anda.",
        });
        return;
      }

      toast({
        type: "success",
        title: nextValue
          ? "Program Affiliate diaktifkan"
          : "Program Affiliate dinonaktifkan",
        description: nextValue
          ? "Menu & pendaftaran Affiliate sekarang tampil di Storefront."
          : "Menu & halaman Affiliate sekarang disembunyikan dari pengunjung.",
      });
      router.refresh();
    } catch {
      setEnabled(!nextValue);
      toast({
        type: "error",
        title: "Terjadi kesalahan jaringan",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#0f172a] shadow-[3px_3px_0px_#0f172a] ${
              enabled ? "bg-[#22d3ee] text-[#0f172a]" : "bg-[#e2e8f0] text-[#475569]"
            }`}
          >
            <Users className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-[#0f172a]">
                Status Program Affiliate Publik
              </h2>
              <Badge variant={enabled ? "success" : "danger"}>
                {enabled ? (
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    AKTIF · TAMPIL
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <EyeOff className="h-3 w-3" />
                    NONAKTIF · HILANG
                  </span>
                )}
              </Badge>
            </div>
            <p className="text-xs font-medium text-[#475569] leading-relaxed max-w-xl">
              {enabled
                ? "Tombol Affiliate muncul di Storefront & Katalog Produk, dan pengunjung dapat mendaftar atau masuk ke Dashboard Affiliate."
                : "Tombol Affiliate disembunyikan sepenuhnya dari Storefront & Katalog, serta halaman pendaftaran Affiliate dinonaktifkan."}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-end sm:pl-4 border-t-2 sm:border-t-0 border-[#0f172a]/10 pt-3 sm:pt-0">
          <CustomSwitch
            checked={enabled}
            disabled={saving}
            onChange={handleToggle}
            label={enabled ? "Aktif" : "Nonaktif"}
          />
        </div>
      </div>
    </Card>
  );
}
