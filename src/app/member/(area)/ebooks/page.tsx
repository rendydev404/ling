import type { Metadata } from "next";
import { getMemberLibrary } from "@/lib/member-data";
import { MemberLibraryClient } from "@/components/member/library-client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Perpustakaan Ebook · Member Area", robots: { index: false } };

export default async function MemberEbooksPage() {
  const ebooks = await getMemberLibrary();
  const owned = ebooks.filter((e) => e.is_owned).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0f172a]">Perpustakaan Ebook</h1>
        <p className="mt-1 text-sm font-medium text-[#475569]">
          {owned} dari {ebooks.length} ebook sudah terbuka untuk Anda. Ebook terkunci bisa dibuka dengan membelinya.
        </p>
      </div>
      <MemberLibraryClient ebooks={ebooks} />
    </div>
  );
}
