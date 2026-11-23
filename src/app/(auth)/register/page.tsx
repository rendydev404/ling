"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Mail, Phone, User } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import { Card } from "@/components/ui/controls";
import { BrandLogo } from "@/components/ui/brand-logo";
import { useToast } from "@/components/ui/custom-toast";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState("buyer");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      toast({
        type: "error",
        title: "Database belum terhubung",
        description: "Periksa konfigurasi Supabase Anda.",
      });
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            role,
          },
        },
      });

      if (error) {
        toast({ type: "error", title: "Pendaftaran gagal", description: error.message });
        return;
      }

      toast({
        type: "success",
        title: "Akun berhasil dibuat",
        description: "Silakan lanjut ke dashboard Anda.",
      });
      router.push(role === "affiliate" ? "/affiliate" : "/portal");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#0f172a] bg-white px-3 py-1.5 text-xs font-extrabold text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#ecfeff]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke Storefront
        </Link>

        <Card className="p-6 sm:p-7">
          <div className="flex items-center gap-3.5 mb-6">
            <BrandLogo size="md" />
            <div>
              <h1 className="text-lg font-extrabold text-[#0f172a]">Buat Akun Baru</h1>
              <p className="text-xs font-medium text-[#475569]">
                Akses produk yang dibeli atau bergabung sebagai Affiliate Partner
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nama Lengkap"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nama lengkap Anda"
              leftIcon={<User className="h-4 w-4" />}
            />
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              leftIcon={<Mail className="h-4 w-4" />}
            />
            <Input
              label="Nomor WhatsApp"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="081234567890"
              leftIcon={<Phone className="h-4 w-4" />}
            />
            <CustomSelect
              label="Tujuan Akun"
              value={role}
              onChange={setRole}
              options={[
                {
                  value: "buyer",
                  label: "Pembeli / Member",
                  description: "Akses produk digital, kursus online, jadwal, dan membership",
                },
                {
                  value: "affiliate",
                  label: "Affiliate Partner",
                  description: "Promosikan produk dan dapatkan komisi per penjualan",
                },
              ]}
            />
            <Input
              label="Kata Sandi"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              leftIcon={<Lock className="h-4 w-4" />}
            />
            <Button type="submit" className="w-full" size="lg" isLoading={loading}>
              Daftar Akun
            </Button>
          </form>

          <p className="mt-5 text-center text-xs font-medium text-[#475569]">
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="font-extrabold text-[#7e22ce] underline decoration-2 underline-offset-2 hover:text-[#0891b2]"
            >
              Masuk di sini
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
