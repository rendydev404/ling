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
    accentBg: "bg-[#67e8f9]",
    accentText: "text-[#0f172a]",
    icon: FileDown,
  },
  course: {
    label: "Kelas Online",
    shortLabel: "Course",
    ctaLabel: "Daftar Kelas Sekarang",
    description: "Materi video & artikel terstruktur dengan progress tracker.",
    accentBg: "bg-[#d8b4fe]",
    accentText: "text-[#0f172a]",
    icon: BookOpen,
  },
  appointment: {
    label: "Konsultasi 1-on-1",
    shortLabel: "Booking",
    ctaLabel: "Pilih Jadwal & Booking",
    description: "Pesan slot waktu privat untuk konsultasi atau coaching.",
    accentBg: "bg-[#fde047]",
    accentText: "text-[#0f172a]",
    icon: CalendarClock,
  },
  event: {
    label: "Event & Webinar",
    shortLabel: "Event",
    ctaLabel: "Pesan Tiket Sekarang",
    description: "Tiket live webinar atau workshop lengkap dengan E-Ticket otomatis.",
    accentBg: "bg-[#c084fc]",
    accentText: "text-[#0f172a]",
    icon: Ticket,
  },
  physical: {
    label: "Produk Fisik",
    shortLabel: "Fisik",
    ctaLabel: "Pesan Sekarang",
    description: "Merchandise atau buku cetak dikirim langsung ke alamat Anda.",
    accentBg: "bg-[#a5f3fc]",
    accentText: "text-[#0f172a]",
    icon: Package,
  },
  donation: {
    label: "Donasi & Support",
    shortLabel: "Support",
    ctaLabel: "Kirim Dukungan",
    description: "Dukung karya kreator dengan nominal pilihan Anda.",
    accentBg: "bg-[#fda4af]",
    accentText: "text-[#0f172a]",
    icon: HeartHandshake,
  },
  membership: {
    label: "Membership",
    shortLabel: "Member",
    ctaLabel: "Gabung Membership",
    description: "Akses komunitas privat dan konten eksklusif berkala.",
    accentBg: "bg-[#e9d5ff]",
    accentText: "text-[#0f172a]",
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
