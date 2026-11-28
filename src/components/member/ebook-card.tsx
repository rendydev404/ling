"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, BookOpenCheck, Gift, Lock, ShoppingCart } from "lucide-react";
import { cn, formatIDR } from "@/lib/utils";
import { ACCESS_LABEL, coverUrl, ebookProgressPct, type MemberEbook } from "@/lib/ebooks";

export function MemberEbookCover({
  ebook,
  locked = false,
  className,
  priority = false,
}: {
  ebook: Pick<MemberEbook, "id" | "title" | "has_cover" | "updated_at">;
  locked?: boolean;
  className?: string;
  priority?: boolean;
}) {
  const src = ebook.has_cover ? coverUrl(ebook.id, ebook.updated_at) : null;
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  const showImage = Boolean(src && src !== failedSrc);

  return (
    <div
      className={cn(
        "relative aspect-[3/4] overflow-hidden rounded-xl border-2 border-[#0f172a] bg-[#f3e8ff]",
        className
      )}
    >
      {showImage && src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Cover ${ebook.title}`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          onError={() => setFailedSrc(src)}
          className={cn("h-full w-full select-none object-cover", locked && "brightness-[0.55] saturate-50")}
        />
      ) : (
        <div className={cn("flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center", locked && "opacity-60")}>
          <BookOpen className="h-8 w-8 text-[#7e22ce]" />
          <span className="line-clamp-4 text-xs font-extrabold text-[#0f172a]">{ebook.title}</span>
        </div>
      )}
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#0f172a] bg-white shadow-[3px_3px_0px_#0f172a]">
            <Lock className="h-5 w-5 text-[#0f172a]" />
          </span>
        </div>
      )}
    </div>
  );
}

export function MemberEbookCard({ ebook }: { ebook: MemberEbook }) {
  if (!ebook.is_owned) return <LockedEbookCard ebook={ebook} />;

  const pct = ebookProgressPct(ebook);
  const started = Boolean(ebook.last_read_at);
  const finished = pct >= 100;

  return (
    <div className="group flex flex-col">
      <Link href={`/member/baca/${ebook.id}`} className="block transition-transform group-hover:-translate-y-1">
        <div className="relative">
          <MemberEbookCover ebook={ebook} className="shadow-[4px_4px_0px_#0f172a]" />
          {ebook.access_source && (
            <span
              className={cn(
                "absolute left-2 top-2 inline-flex items-center gap-1 rounded-md border-2 border-[#0f172a] px-1.5 py-0.5 text-[10px] font-black uppercase",
                ebook.access_source === "gift" ? "bg-[#fde047]" : ebook.access_source === "membership" ? "bg-[#d8b4fe]" : "bg-[#67e8f9]"
              )}
            >
              {ebook.access_source === "gift" && <Gift className="h-3 w-3" />}
              {ACCESS_LABEL[ebook.access_source]}
            </span>
          )}
        </div>
      </Link>
      <div className="mt-3 flex flex-1 flex-col">
        <h3 className="line-clamp-2 text-sm font-extrabold leading-snug text-[#0f172a]">{ebook.title}</h3>
        {ebook.author && <p className="mt-0.5 truncate text-xs font-medium text-[#475569]">{ebook.author}</p>}
        <div className="mb-3 mt-2 space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-sm border-2 border-[#0f172a] bg-[#f1f5f9]">
            <div className="h-full bg-[#22d3ee]" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[11px] font-bold text-[#475569]">
            {finished ? "Selesai dibaca" : started ? `Hlm ${ebook.last_page} · ${pct}%` : "Belum dibaca"}
          </p>
        </div>
        <Link
          href={`/member/baca/${ebook.id}`}
          className="mt-auto inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border-2 border-[#0f172a] bg-[#22d3ee] px-3 text-xs font-extrabold text-[#0f172a] shadow-[2px_2px_0px_#0f172a] transition-all hover:bg-[#06b6d4]"
        >
          {finished ? <BookOpenCheck className="h-3.5 w-3.5" /> : <BookOpen className="h-3.5 w-3.5" />}
          {finished ? "Baca lagi" : started ? "Lanjut baca" : "Mulai baca"}
        </Link>
      </div>
    </div>
  );
}

function LockedEbookCard({ ebook }: { ebook: MemberEbook }) {
  return (
    <div className="flex flex-col">
      <MemberEbookCover ebook={ebook} locked className="shadow-[4px_4px_0px_#0f172a]" />
      <div className="mt-3 flex flex-1 flex-col">
        <p className="mb-3 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-[#7e22ce]">
          <Lock className="h-3 w-3" /> Terkunci
        </p>
        {ebook.buy_slug ? (
          <Link
            href={`/p/${ebook.buy_slug}`}
            className="mt-auto inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border-2 border-[#0f172a] bg-[#a855f7] px-3 text-xs font-extrabold text-white shadow-[2px_2px_0px_#0f172a] transition-all hover:bg-[#9333ea]"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {ebook.buy_price != null && ebook.buy_price > 0 ? `Beli ${formatIDR(ebook.buy_price)}` : "Buka akses"}
          </Link>
        ) : (
          <span className="mt-auto inline-flex h-9 items-center justify-center rounded-lg border-2 border-dashed border-[#0f172a] px-3 text-[11px] font-extrabold text-[#475569]">
            Segera tersedia
          </span>
        )}
      </div>
    </div>
  );
}
