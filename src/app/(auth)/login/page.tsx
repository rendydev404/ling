"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Lock, Mail, Store } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/controls";
import { useToast } from "@/components/ui/custom-toast";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/portal";
  const { toast } = useToast();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      toast({
        type: "info",
        title: "Mode Pratinjau Aktif",
        description: "Tambahkan kredensial Supabase di .env.local untuk mengaktifkan login akun.",
      });
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        toast({ type: "error", title: "Login gagal", description: error.message });
        return;
      }

      toast({ type: "success", title: "Berhasil masuk" });
      router.push(nextPath);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] px-4 py-10">
      <div className="w-full max-w-md space-y-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#475569] hover:text-[#0f172a]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke Storefront
        </Link>

        <Card className="p-6 sm:p-7">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#059669] text-white">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-[#0f172a]">Masuk ke Akun</h1>
              <p className="text-xs text-[#64748b]">
                Akses Buyer Portal, Affiliate Dashboard, atau Admin Panel
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

          <p className="mt-5 text-center text-xs text-[#64748b]">
            Belum punya akun?{" "}
            <Link href="/register" className="font-semibold text-[#059669] hover:underline">
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
    <React.Suspense fallback={<div className="min-h-screen bg-[#f8fafc]" />}>
      <LoginForm />
    </React.Suspense>
  );
}
