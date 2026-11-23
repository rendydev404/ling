import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { ToastProvider } from "@/components/ui/custom-toast";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["500", "600", "700"],
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Ling — Storefront & Creator Monetization",
  description:
    "Platform Link-in-Bio, Produk Digital, Kelas Online, Konsultasi 1-on-1, Event, Membership, dan Affiliate terintegrasi Midtrans.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${spaceGrotesk.variable} ${plusJakarta.variable}`}>
      <body className="min-h-screen bg-[#f4f8fb] text-[#0f172a] antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
