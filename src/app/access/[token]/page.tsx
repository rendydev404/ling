import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { loadOrderAccess } from "@/lib/order-access-data";
import { AccessView } from "@/components/checkout/access-view";
import { Card } from "@/components/ui/controls";

export const dynamic = "force-dynamic";

// The token in the URL is a credential: keep it out of search engines and Referer headers
export const metadata: Metadata = {
  title: "Akses Produk",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function AccessPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await loadOrderAccess(token);

  if (!data) {
    return (
      <div className="min-h-screen px-4 py-14 flex justify-center">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[#0f172a] bg-[#fda4af] shadow-[3px_3px_0px_#0f172a]">
            <ShieldAlert className="h-7 w-7 text-[#0f172a]" />
          </div>
          <h1 className="mt-4 text-lg font-extrabold text-[#0f172a]">Link akses tidak valid</h1>
          <p className="mt-1.5 text-xs font-medium text-[#475569]">
            Pastikan kamu membuka link lengkap dari email pembelian, atau pembayaran pesanan ini belum
            selesai.
          </p>
          <Link
            href="/member"
            className="mt-5 inline-block text-xs font-extrabold text-[#0f172a] underline decoration-2 underline-offset-4"
          >
            Buka Member Area
          </Link>
        </Card>
      </div>
    );
  }

  return <AccessView data={data} token={token} />;
}
