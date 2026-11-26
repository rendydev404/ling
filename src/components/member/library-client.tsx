"use client";

import * as React from "react";
import { BookOpen, Lock } from "lucide-react";
import { CustomTabs, EmptyState } from "@/components/ui/controls";
import { CustomSearchInput } from "@/components/ui/input";
import { ebookProgressPct, type MemberEbook } from "@/lib/ebooks";
import { MemberEbookCard } from "./ebook-card";

type Filter = "all" | "owned" | "reading" | "done" | "locked";

export function MemberLibraryClient({ ebooks }: { ebooks: MemberEbook[] }) {
  const [filter, setFilter] = React.useState<Filter>("all");
  const [query, setQuery] = React.useState("");

  const owned = ebooks.filter((e) => e.is_owned);
  const reading = owned.filter((e) => e.last_read_at && ebookProgressPct(e) < 100);
  const done = owned.filter((e) => ebookProgressPct(e) >= 100);
  const locked = ebooks.filter((e) => !e.is_owned);

  const source = { all: ebooks, owned, reading, done, locked }[filter];
  const q = query.trim().toLowerCase();
  const list = q ? source.filter((e) => `${e.title} ${e.author ?? ""}`.toLowerCase().includes(q)) : source;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <CustomTabs
            activeTab={filter}
            onChange={(id) => setFilter(id as Filter)}
            className="flex-nowrap"
            tabs={[
              { id: "all", label: "Semua", badge: ebooks.length },
              { id: "owned", label: "Milik Saya", badge: owned.length },
              { id: "reading", label: "Sedang Dibaca", badge: reading.length },
              { id: "done", label: "Selesai", badge: done.length },
              { id: "locked", label: "Terkunci", icon: <Lock className="h-3 w-3" />, badge: locked.length },
            ]}
          />
        </div>
        <CustomSearchInput value={query} onChange={setQuery} placeholder="Cari judul atau penulis…" className="lg:max-w-xs" />
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={filter === "locked" ? <Lock className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
          title={
            q
              ? "Tidak ada ebook yang cocok"
              : filter === "locked"
                ? "Semua ebook sudah terbuka"
                : filter === "reading"
                  ? "Belum ada yang sedang dibaca"
                  : filter === "done"
                    ? "Belum ada ebook yang selesai"
                    : "Belum ada ebook"
          }
          description={
            q
              ? "Coba kata kunci lain."
              : filter === "locked"
                ? "Anda sudah memiliki akses ke seluruh koleksi."
                : "Ebook yang Anda beli atau dapatkan aksesnya akan muncul di sini."
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {list.map((e) => (
            <MemberEbookCard key={e.id} ebook={e} />
          ))}
        </div>
      )}
    </div>
  );
}
