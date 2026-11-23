"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ExternalLink,
  Grid2x2,
  Layers,
  LayoutDashboard,
  LogOut,
  Package,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tag,
  Users,
  Webhook,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ALL_NAV_ITEMS = [
  { href: "/admin", label: "Ringkasan", shortLabel: "Home", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Produk & Layanan", shortLabel: "Produk", icon: Package },
  { href: "/admin/orders", label: "Pesanan & Pengiriman", shortLabel: "Pesanan", icon: ShoppingCart },
  { href: "/admin/builder", label: "Page Builder & Tema", shortLabel: "Builder", icon: Layers },
  { href: "/admin/vouchers", label: "Voucher & Kupon", shortLabel: "Voucher", icon: Tag },
  { href: "/admin/affiliates", label: "Program Affiliate", shortLabel: "Affiliate", icon: Users },
  { href: "/admin/analytics", label: "Analitik Toko", shortLabel: "Analitik", icon: BarChart3 },
  { href: "/admin/integrations", label: "Pixel & Webhooks", shortLabel: "Webhook", icon: Webhook },
];

const PRIMARY_MOBILE_ITEMS = ALL_NAV_ITEMS.slice(0, 4);
const SECONDARY_MOBILE_ITEMS = ALL_NAV_ITEMS.slice(4);

function isRouteActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({
  children,
  brandName,
  isDemoMode,
  isMidtransActive,
}: {
  children: React.ReactNode;
  brandName: string;
  isDemoMode: boolean;
  isMidtransActive?: boolean;
}) {
  const pathname = usePathname();
  const [moreSheetOpen, setMoreSheetOpen] = React.useState(false);

  const activeItem =
    ALL_NAV_ITEMS.find((item) => isRouteActive(pathname, item.href, item.exact)) ??
    ALL_NAV_ITEMS[0];

  const isSecondaryActive = SECONDARY_MOBILE_ITEMS.some((item) =>
    isRouteActive(pathname, item.href, item.exact)
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:block lg:w-68 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">
        <div className="flex h-full flex-col bg-white border-r-2 border-[#0f172a]">
          <div className="flex h-16 items-center justify-between px-5 border-b-2 border-[#0f172a] bg-[#ecfeff]">
            <Link href="/admin" className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#0f172a] bg-[#22d3ee] text-[#0f172a] shadow-[2px_2px_0px_#0f172a]">
                <Store className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-[#0f172a] truncate">{brandName}</p>
                <p className="text-[10px] font-black uppercase tracking-wider text-[#7e22ce]">
                  Owner Workspace
                </p>
              </div>
            </Link>
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto p-3.5">
            {ALL_NAV_ITEMS.map((item) => {
              const isActive = isRouteActive(pathname, item.href, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-2 px-3.5 py-2.5 text-sm font-extrabold transition-all",
                    isActive
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

          <div className="border-t-2 border-[#0f172a] bg-[#f8fafc] p-3.5 space-y-2">
            <Link
              href="/"
              target="_blank"
              className="flex items-center justify-between rounded-xl border-2 border-[#0f172a] bg-[#a855f7] px-3.5 py-2.5 text-xs font-extrabold text-white shadow-[3px_3px_0px_#0f172a] transition-all hover:bg-[#9333ea] hover:-translate-x-0.5 hover:-translate-y-0.5"
            >
              <span>Buka Storefront Publik</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            {!isDemoMode && (
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#0f172a] bg-white px-3.5 py-2 text-xs font-extrabold text-[#be123c] shadow-[2px_2px_0px_#0f172a] hover:bg-[#ffe4e6] cursor-pointer transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Keluar dari Admin</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN WORKSPACE COLUMN */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Desktop Top Utility Bar */}
        <header className="hidden lg:flex sticky top-0 z-20 h-16 items-center justify-between border-b-2 border-[#0f172a] bg-white px-8">
          <div className="flex items-center gap-2.5">
            <span className="rounded-lg border-2 border-[#0f172a] bg-[#f3e8ff] px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-[#0f172a] shadow-[2px_2px_0px_#0f172a]">
              Menu Aktif
            </span>
            <span className="text-sm font-black text-[#0f172a]">{activeItem.label}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border-2 border-[#0f172a] px-2.5 py-1 text-[11px] font-black shadow-[2px_2px_0px_#0f172a]",
                isMidtransActive ? "bg-[#67e8f9] text-[#0f172a]" : "bg-[#fef08a] text-[#0f172a]"
              )}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {isMidtransActive ? "Midtrans Production Aktif" : "Midtrans Standby"}
            </span>
          </div>
        </header>

        {/* Mobile Compact Top Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b-2 border-[#0f172a] bg-white px-3.5 lg:hidden">
          <Link href="/admin" className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-[#22d3ee] text-[#0f172a] shadow-[2px_2px_0px_#0f172a]">
              <Store className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-[#0f172a] truncate leading-tight">
                {activeItem.label}
              </p>
              <p className="text-[10px] font-bold text-[#7e22ce] truncate leading-tight">
                {brandName}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href="/"
              target="_blank"
              className="inline-flex h-8 items-center gap-1 rounded-lg border-2 border-[#0f172a] bg-[#a855f7] px-2.5 text-[11px] font-extrabold text-white shadow-[2px_2px_0px_#0f172a]"
            >
              <span>Toko</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
            {!isDemoMode && (
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  aria-label="Keluar"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-[#ffe4e6] text-[#be123c] shadow-[2px_2px_0px_#0f172a] cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </form>
            )}
          </div>
        </header>

        {/* Main Page Content (padded bottom for Mobile Bottom Bar) */}
        <main className="flex-1 px-3.5 pt-4 pb-24 sm:px-6 sm:pt-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* MOBILE "LAINNYA" BOTTOM SHEET (triggered from 5th Bottom Bar tab) */}
      {moreSheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-[#0f172a]/60"
            onClick={() => setMoreSheetOpen(false)}
          />
          <div className="relative z-10 mx-2.5 mb-20 rounded-2xl border-2 border-[#0f172a] bg-white p-4 shadow-[5px_5px_0px_#0f172a]">
            <div className="flex items-center justify-between border-b-2 border-[#0f172a] pb-3 mb-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-[#0f172a]">
                  Menu Admin Lainnya
                </p>
                <p className="text-[11px] font-semibold text-[#475569]">
                  Pemasaran, analitik, & integrasi sistem
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMoreSheetOpen(false)}
                aria-label="Tutup menu"
                className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-[#f4f8fb] text-[#0f172a] shadow-[2px_2px_0px_#0f172a] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {SECONDARY_MOBILE_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isRouteActive(pathname, item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreSheetOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border-2 border-[#0f172a] p-3 text-xs font-extrabold shadow-[2px_2px_0px_#0f172a] transition-all",
                      active
                        ? "bg-[#22d3ee] text-[#0f172a]"
                        : "bg-[#f8fafc] text-[#0f172a] active:bg-[#f3e8ff]"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-[#0f172a]",
                        active ? "bg-white" : "bg-[#f3e8ff]"
                      )}
                    >
                      <Icon className="h-4 w-4 text-[#0f172a]" />
                    </div>
                    <span className="leading-tight">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav
        aria-label="Navigasi bawah admin"
        className="fixed inset-x-0 bottom-0 z-40 lg:hidden border-t-2 border-[#0f172a] bg-white px-2 pt-1.5 pb-[calc(0.45rem+env(safe-area-inset-bottom))] shadow-[0_-3px_0px_#0f172a]"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {PRIMARY_MOBILE_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              !moreSheetOpen && isRouteActive(pathname, item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreSheetOpen(false)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 py-1.5 px-1 transition-all",
                  isActive
                    ? "border-[#0f172a] bg-[#22d3ee] text-[#0f172a] shadow-[2px_2px_0px_#0f172a] -translate-y-0.5"
                    : "border-transparent text-[#475569] hover:text-[#0f172a]"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-[10px] font-black tracking-tight leading-none">
                  {item.shortLabel}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreSheetOpen((prev) => !prev)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 py-1.5 px-1 transition-all cursor-pointer",
              moreSheetOpen || isSecondaryActive
                ? "border-[#0f172a] bg-[#a855f7] text-white shadow-[2px_2px_0px_#0f172a] -translate-y-0.5"
                : "border-transparent text-[#475569] hover:text-[#0f172a]"
            )}
          >
            <Grid2x2 className="h-4 w-4 shrink-0" />
            <span className="text-[10px] font-black tracking-tight leading-none">
              Menu
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}
