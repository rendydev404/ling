"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Lock, Mail } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/controls";
import { BrandLogo } from "@/components/ui/brand-logo";
import { useToast } from "@/components/ui/custom-toast";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicitNext = searchParams.get("next");
  const { toast } = useToast();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
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
      const normalized = email.trim().toLowerCase();
      const { error } = await supabase.auth.signInWithPassword({
        email: normalized,
        password,
      });

      if (error) {
        toast({ type: "error", title: "Login gagal", description: error.message });
        return;
      }

      toast({ type: "success", title: "Berhasil masuk" });
      const target =
        explicitNext || (normalized === "rendyakun50@gmail.com" ? "/admin" : "/member");
      router.push(target);
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
              <h1 className="text-lg font-extrabold text-[#0f172a]">Masuk Pelanggan</h1>
              <p className="text-xs font-medium text-[#475569]">
                Akses produk digital, kelas online, tiket, & komisi affiliate Anda
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              label="Kata Sandi"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan kata sandi"
              leftIcon={<Lock className="h-4 w-4" />}
            />
            <Button type="submit" className="w-full" size="lg" isLoading={loading}>
              Masuk Sekarang
            </Button>
          </form>

          <p className="mt-5 text-center text-xs font-medium text-[#475569]">
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="font-extrabold text-[#7e22ce] underline decoration-2 underline-offset-2 hover:text-[#0891b2]"
            >
              Daftar di sini
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[#f4f8fb]" />}>
      <LoginForm />
    </React.Suspense>
  );
}
