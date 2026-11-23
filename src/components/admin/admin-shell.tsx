"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ExternalLink,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  Store,
  Tag,
  Users,
  Webhook,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Ringkasan", icon: LayoutDashboard, exact: true },
  { href: "/admin/builder", label: "Page Builder & Tema", icon: Layers },
  { href: "/admin/products", label: "Produk & Layanan", icon: Package },
  { href: "/admin/orders", label: "Pesanan & Pengiriman", icon: ShoppingCart },
  { href: "/admin/vouchers", label: "Voucher & Kupon", icon: Tag },
  { href: "/admin/affiliates", label: "Program Affiliate", icon: Users },
  { href: "/admin/analytics", label: "Analitik", icon: BarChart3 },
  { href: "/admin/integrations", label: "Pixel & Webhooks", icon: Webhook },
];

export function AdminShell({
  children,
  brandName,
  isDemoMode,
}: {
  children: React.ReactNode;
  brandName: string;
  isDemoMode: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white border-r border-[#e2e8f0]">
      <div className="flex h-16 items-center justify-between px-5 border-b border-[#e2e8f0]">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#059669] text-white">
            <Store className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-[#0f172a] truncate">{brandName}</p>
            <p className="text-[11px] font-medium text-[#64748b]">Owner Dashboard</p>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] hover:bg-[#f1f5f9]"
          aria-label="Tutup menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-[#ecfdf5] text-[#047857]"
                  : "text-[#475569] hover:bg-[#f8fafc] hover:text-[#0f172a]"
              )}
            >
              <Icon
                className={cn("h-4 w-4 shrink-0", isActive ? "text-[#059669]" : "text-[#64748b]")}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#e2e8f0] p-3 space-y-1.5">
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5 text-xs font-bold text-[#0f172a] hover:bg-[#f1f5f9]"
        >
          <span>Lihat Storefront</span>
          <ExternalLink className="h-3.5 w-3.5 text-[#64748b]" />
        </Link>
        {!isDemoMode && (
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-[#64748b] hover:bg-[#fef2f2] hover:text-[#dc2626] cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Keluar</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] lg:flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 shrink-0">{sidebarContent}</div>
          <div
            className="flex-1 bg-[#0f172a]/40"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[#e2e8f0] bg-white px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2e8f0] text-[#0f172a]"
            aria-label="Buka navigasi"
          >
            <Menu className="h-4 w-4" />
          </button>
          <span className="text-sm font-extrabold text-[#0f172a]">{brandName}</span>
          <Link
            href="/"
            className="text-xs font-semibold text-[#059669]"
          >
            Storefront
          </Link>
        </header>

        {isDemoMode && (
          <div className="border-b border-[#fde68a] bg-[#fffbeb] px-6 py-2.5 text-xs font-medium text-[#92400e]">
            Mode Pratinjau Lokal — Untuk menyimpan perubahan secara permanen dan memproses pembayaran nyata, isi konfigurasi Supabase & Midtrans di <code>.env.local</code>.
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
