import * as React from "react";
import {
  BookOpen,
  CalendarClock,
  Crown,
  FileDown,
  HeartHandshake,
  Package,
  Ticket,
} from "lucide-react";
import type { ProductType } from "@/types/database";

export const PRODUCT_TYPE_META: Record<
  ProductType,
  {
    label: string;
    shortLabel: string;
    ctaLabel: string;
    description: string;
    accentBg: string;
    accentText: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  digital: {
    label: "Produk Digital",
    shortLabel: "Digital",
    ctaLabel: "Beli & Unduh Instan",
    description: "E-book, template, preset, atau file digital dengan pengiriman otomatis.",
    accentBg: "bg-[#ecfdf5]",
    accentText: "text-[#047857]",
    icon: FileDown,
  },
  course: {
    label: "Kelas Online",
    shortLabel: "Course",
    ctaLabel: "Daftar Kelas Sekarang",
    description: "Materi video & artikel terstruktur dengan progress tracker.",
    accentBg: "bg-[#eff6ff]",
    accentText: "text-[#1d4ed8]",
    icon: BookOpen,
  },
  appointment: {
    label: "Konsultasi 1-on-1",
    shortLabel: "Booking",
    ctaLabel: "Pilih Jadwal & Booking",
    description: "Pesan slot waktu privat untuk konsultasi atau coaching.",
    accentBg: "bg-[#fef3c7]",
    accentText: "text-[#b45309]",
    icon: CalendarClock,
  },
  event: {
    label: "Event & Webinar",
    shortLabel: "Event",
    ctaLabel: "Pesan Tiket Sekarang",
    description: "Tiket live webinar atau workshop lengkap dengan E-Ticket otomatis.",
    accentBg: "bg-[#f3e8ff]",
    accentText: "text-[#7e22ce]",
    icon: Ticket,
  },
  physical: {
    label: "Produk Fisik",
    shortLabel: "Fisik",
    ctaLabel: "Pesan Sekarang",
    description: "Merchandise atau buku cetak dikirim langsung ke alamat Anda.",
    accentBg: "bg-[#f1f5f9]",
    accentText: "text-[#334155]",
    icon: Package,
  },
  donation: {
    label: "Donasi & Support",
    shortLabel: "Support",
    ctaLabel: "Kirim Dukungan",
    description: "Dukung karya kreator dengan nominal pilihan Anda.",
    accentBg: "bg-[#fef2f2]",
    accentText: "text-[#b91c1c]",
    icon: HeartHandshake,
  },
  membership: {
    label: "Membership",
    shortLabel: "Member",
    ctaLabel: "Gabung Membership",
    description: "Akses komunitas privat dan konten eksklusif berkala.",
    accentBg: "bg-[#fef9c3]",
    accentText: "text-[#a16207]",
    icon: Crown,
  },
};

export function ProductTypeIcon({
  type,
  className = "h-4 w-4",
}: {
  type: ProductType;
  className?: string;
}) {
  const Icon = PRODUCT_TYPE_META[type].icon;
  return <Icon className={className} />;
}
