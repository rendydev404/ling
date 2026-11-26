"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Mail, Save, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/controls";
import { useToast } from "@/components/ui/custom-toast";
import { createClient } from "@/lib/supabase/client";

export function AccountClient({
  email,
  fullName,
  phone,
  memberSince,
}: {
  email: string;
  fullName: string;
  phone: string;
  memberSince: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = React.useState(fullName);
  const [hp, setHp] = React.useState(phone);
  const [saving, setSaving] = React.useState(false);
  const [pw, setPw] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [pwSaving, setPwSaving] = React.useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/member/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: name, phone: hp || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan.");
      toast({ type: "success", title: "Profil disimpan" });
      router.refresh();
    } catch (err) {
      toast({ type: "error", title: "Gagal", description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) {
      toast({ type: "error", title: "Kata sandi minimal 8 karakter" });
      return;
    }
    if (pw !== pw2) {
      toast({ type: "error", title: "Konfirmasi kata sandi tidak sama" });
      return;
    }
    setPwSaving(true);
    try {
      const { error } = await createClient().auth.updateUser({ password: pw });
      if (error) throw error;
      setPw("");
      setPw2("");
      toast({ type: "success", title: "Kata sandi diperbarui" });
    } catch (err) {
      toast({ type: "error", title: "Gagal mengganti kata sandi", description: (err as Error).message });
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-5 sm:p-6">
        <form onSubmit={saveProfile} className="space-y-4">
          <h2 className="inline-flex items-center gap-2 text-base font-extrabold text-[#0f172a]">
            <UserRound className="h-4 w-4" /> Profil
          </h2>
          <div className="flex items-center gap-2 rounded-xl border-2 border-[#0f172a] bg-[#f8fafc] px-3 py-2.5 text-sm">
            <Mail className="h-4 w-4 shrink-0 text-[#7e22ce]" />
            <span className="truncate font-bold text-[#0f172a]">{email}</span>
          </div>
          <p className="-mt-2 text-[11px] font-medium text-[#475569]">
            Pembelian dengan email ini otomatis masuk ke akun Anda. Member sejak {memberSince}.
          </p>
          <Input label="Nama lengkap" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          <Input label="Nomor WhatsApp" value={hp} onChange={(e) => setHp(e.target.value)} placeholder="08xxxxxxxxxx" inputMode="tel" />
          <Button type="submit" isLoading={saving}>
            <Save className="h-4 w-4" /> Simpan Profil
          </Button>
        </form>
      </Card>

      <Card className="p-5 sm:p-6">
        <form onSubmit={changePassword} className="space-y-4">
          <h2 className="inline-flex items-center gap-2 text-base font-extrabold text-[#0f172a]">
            <KeyRound className="h-4 w-4" /> Ganti Kata Sandi
          </h2>
          <Input label="Kata sandi baru" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <Input
            label="Ulangi kata sandi baru"
            type="password"
            autoComplete="new-password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
          />
          <Button type="submit" variant="secondary" isLoading={pwSaving}>
            Perbarui Kata Sandi
          </Button>
        </form>
      </Card>
    </div>
  );
}
