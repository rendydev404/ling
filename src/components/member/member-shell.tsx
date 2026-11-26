"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  FileDown,
  CalendarClock,
  Crown,
  ExternalLink,
  GraduationCap,
  Grid2x2,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/ui/brand-logo";

const NAV = [
  { href: "/member", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard, exact: true },
  { href: "/member/ebooks", label: "Perpustakaan Ebook", shortLabel: "Ebook", icon: BookOpen },
  { href: "/member/kelas", label: "Kelas Saya", shortLabel: "Kelas", icon: GraduationCap },
  { href: "/member/pesanan", label: "Riwayat Pesanan", shortLabel: "Pesanan", icon: ShoppingBag },
  { href: "/member/jadwal", label: "Jadwal & Tiket", shortLabel: "Jadwal", icon: CalendarClock },
  { href: "/member/membership", label: "Membership", shortLabel: "Member", icon: Crown },
  { href: "/member/digital", label: "File & Link Digital", shortLabel: "File", icon: FileDown },
  { href: "/member/akun", label: "Akun Saya", shortLabel: "Akun", icon: UserRound },
];
const PRIMARY = NAV.slice(0, 4);
const SECONDARY = NAV.slice(4);

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function MemberShell({
  children,
  brandName,
  memberName,
  memberEmail,
  isAdmin,
}: {
  children: React.ReactNode;
  brandName: string;
  memberName: string;
  memberEmail: string;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const active = NAV.find((n) => isActive(pathname, n.href, n.exact)) ?? NAV[0];
  const secondaryActive = SECONDARY.some((n) => isActive(pathname, n.href, n.exact));
  const initials = (memberName || memberEmail).trim().slice(0, 1).toUpperCase();

  const signOut = (
    <form action="/api/auth/signout" method="post">
      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#0f172a] bg-white px-3.5 py-2 text-xs font-extrabold text-[#be123c] shadow-[2px_2px_0px_#0f172a] hover:bg-[#ffe4e6] cursor-pointer"
      >
        <LogOut className="h-3.5 w-3.5" />
        Keluar
      </button>
    </form>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block lg:w-72 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">
        <div className="flex h-full flex-col border-r-2 border-[#0f172a] bg-white">
          <div className="flex h-16 items-center border-b-2 border-[#0f172a] bg-[#ecfeff] px-5">
            <Link href="/member" className="flex min-w-0 items-center gap-2.5">
              <BrandLogo size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[#0f172a]">{brandName}</p>
                <p className="text-[10px] font-black uppercase tracking-wider text-[#7e22ce]">Member Area</p>
              </div>
            </Link>
          </div>

          <div className="mx-3.5 mt-3.5 flex items-center gap-3 rounded-xl border-2 border-[#0f172a] bg-[#f3e8ff] p-3 shadow-[2px_2px_0px_#0f172a]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-[#a855f7] text-sm font-black text-white">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-[#0f172a]">{memberName || "Member"}</p>
              <p className="truncate text-[11px] font-semibold text-[#475569]">{memberEmail}</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto p-3.5">
            {NAV.map((item) => {
              const on = isActive(pathname, item.href, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-2 px-3.5 py-2.5 text-sm font-extrabold transition-all",
                    on
                      ? "border-[#0f172a] bg-[#22d3ee] text-[#0f172a] shadow-[3px_3px_0px_#0f172a]"
                      : "border-transparent text-[#334155] hover:border-[#0f172a] hover:bg-[#f3e8ff] hover:text-[#0f172a]"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-[#0f172a]" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="space-y-2 border-t-2 border-[#0f172a] bg-[#f8fafc] p-3.5">
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center justify-between rounded-xl border-2 border-[#0f172a] bg-[#fde047] px-3.5 py-2.5 text-xs font-extrabold text-[#0f172a] shadow-[3px_3px_0px_#0f172a]"
              >
                <span>Buka Admin</span>
                <ShieldCheck className="h-3.5 w-3.5" />
              </Link>
            )}
            <Link
              href="/"
              className="flex items-center justify-between rounded-xl border-2 border-[#0f172a] bg-[#a855f7] px-3.5 py-2.5 text-xs font-extrabold text-white shadow-[3px_3px_0px_#0f172a] hover:bg-[#9333ea]"
            >
              <span>Kembali ke Toko</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            {signOut}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b-2 border-[#0f172a] bg-white px-3.5 lg:hidden">
          <Link href="/member" className="flex min-w-0 items-center gap-2">
            <BrandLogo size="xs" />
            <div className="min-w-0">
              <p className="truncate text-xs font-black leading-tight text-[#0f172a]">{active.label}</p>
              <p className="truncate text-[10px] font-bold leading-tight text-[#7e22ce]">{brandName} · Member</p>
            </div>
          </Link>
          <Link
            href="/member/akun"
            aria-label="Akun saya"
            className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-[#a855f7] text-xs font-black text-white shadow-[2px_2px_0px_#0f172a]"
          >
            {initials}
          </Link>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-3.5 pt-4 pb-24 sm:px-6 sm:pt-6 lg:p-8">{children}</main>
      </div>

      {/* Mobile "more" sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
          <div className="fixed inset-0 bg-[#0f172a]/60" onClick={() => setSheetOpen(false)} />
          <div className="relative z-10 mx-2.5 mb-20 space-y-3 rounded-2xl border-2 border-[#0f172a] bg-white p-4 shadow-[5px_5px_0px_#0f172a]">
            <div className="flex items-center justify-between border-b-2 border-[#0f172a] pb-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-black uppercase tracking-wider text-[#0f172a]">{memberName || "Member"}</p>
                <p className="truncate text-[11px] font-semibold text-[#475569]">{memberEmail}</p>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Tutup menu"
                className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-[#f4f8fb] shadow-[2px_2px_0px_#0f172a] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {SECONDARY.map((item) => {
                const Icon = item.icon;
                const on = isActive(pathname, item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSheetOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border-2 border-[#0f172a] p-3 text-xs font-extrabold shadow-[2px_2px_0px_#0f172a]",
                      on ? "bg-[#22d3ee]" : "bg-[#f8fafc] active:bg-[#f3e8ff]"
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="leading-tight">{item.label}</span>
                  </Link>
                );
              })}
              <Link
                href="/"
                className="flex items-center gap-2.5 rounded-xl border-2 border-[#0f172a] bg-[#a855f7] p-3 text-xs font-extrabold text-white shadow-[2px_2px_0px_#0f172a]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-white text-[#0f172a]">
                  <ExternalLink className="h-4 w-4" />
                </span>
                Toko
              </Link>
            </div>
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#0f172a] bg-[#fde047] px-3.5 py-2 text-xs font-extrabold shadow-[2px_2px_0px_#0f172a]"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Buka Admin
              </Link>
            )}
            {signOut}
          </div>
        </div>
      )}

      {/* Mobile bottom bar */}
      <nav
        aria-label="Navigasi member"
        className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-[#0f172a] bg-white px-2 pt-1.5 pb-[calc(0.45rem+env(safe-area-inset-bottom))] shadow-[0_-3px_0px_#0f172a] lg:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {PRIMARY.map((item) => {
            const Icon = item.icon;
            const on = !sheetOpen && isActive(pathname, item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSheetOpen(false)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-1 py-1.5 transition-all",
                  on
                    ? "-translate-y-0.5 border-[#0f172a] bg-[#22d3ee] text-[#0f172a] shadow-[2px_2px_0px_#0f172a]"
                    : "border-transparent text-[#475569] hover:text-[#0f172a]"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-[10px] font-black leading-none tracking-tight">{item.shortLabel}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setSheetOpen((v) => !v)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-1 py-1.5 transition-all cursor-pointer",
              sheetOpen || secondaryActive
                ? "-translate-y-0.5 border-[#0f172a] bg-[#a855f7] text-white shadow-[2px_2px_0px_#0f172a]"
                : "border-transparent text-[#475569] hover:text-[#0f172a]"
            )}
          >
            <Grid2x2 className="h-4 w-4 shrink-0" />
            <span className="text-[10px] font-black leading-none tracking-tight">Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
