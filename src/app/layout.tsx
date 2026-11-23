import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ToastProvider } from "@/components/ui/custom-toast";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Ling — Storefront & Creator Monetization",
  description:
    "Platform Link-in-Bio, Produk Digital, Kelas Online, Konsultasi 1-on-1, Event, Membership, dan Affiliate terintegrasi Midtrans.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={plusJakarta.variable}>
      <body className="min-h-screen bg-[#f8fafc] text-[#0f172a] antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
