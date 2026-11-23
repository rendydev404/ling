"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Lock, Mail, ShieldCheck } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/controls";
import { useToast } from "@/components/ui/custom-toast";

const PRIMARY_ADMIN_EMAIL = "rendyakun50@gmail.com";

export default function InternalAdminGatePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleAdminSignIn(e: React.FormEvent) {
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
      const normalizedEmail = email.trim().toLowerCase();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error || !data.user) {
        toast({
          type: "error",
          title: "Otentikasi ditolak",
          description: "Kredensial tidak valid.",
        });
        return;
      }

      let isAllowed = normalizedEmail === PRIMARY_ADMIN_EMAIL;
      if (!isAllowed) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
        isAllowed = profile?.role === "admin";
      }

      if (!isAllowed) {
        await supabase.auth.signOut();
        toast({
          type: "error",
          title: "Akses ditolak",
          description: "Halaman ini khusus pemilik sistem.",
        });
        return;
      }

      toast({ type: "success", title: "Akses Owner dibuka" });
      router.push("/admin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-5">
        <div className="inline-flex items-center gap-2 rounded-xl border-2 border-[#0f172a] bg-[#f3e8ff] px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-[#0f172a] shadow-[3px_3px_0px_#0f172a]">
          <ShieldCheck className="h-4 w-4 text-[#7e22ce]" />
          Private Owner Gate
        </div>

        <Card className="p-6 sm:p-7">
          <div className="flex items-center gap-3.5 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#0f172a] bg-[#22d3ee] text-[#0f172a] shadow-[3px_3px_0px_#0f172a]">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-[#0f172a]">Akses Konsol Pemilik</h1>
              <p className="text-xs font-semibold text-[#475569]">
                Halaman otentikasi internal terproteksi
              </p>
            </div>
          </div>

          <form onSubmit={handleAdminSignIn} className="space-y-4">
            <Input
              label="Email Administrator"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@domain.com"
              leftIcon={<Mail className="h-4 w-4" />}
            />
            <Input
              label="Kata Sandi"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
            />
            <Button type="submit" className="w-full" size="lg" isLoading={loading}>
              Buka Dashboard Admin
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
