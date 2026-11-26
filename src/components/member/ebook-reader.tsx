"use client";

import * as React from "react";
import Link from "next/link";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  ListTree,
  Loader2,
  Maximize,
  Minimize,
  Minus,
  Moon,
  Plus,
  Search,
  ShieldCheck,
  Sun,
  Sunset,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { loadPdfjs, pdfAssetOptions } from "@/lib/pdf-client";

type Theme = "light" | "sepia" | "dark";
type Panel = null | "toc" | "bookmarks" | "search";

interface OutlineNode {
  title: string;
  page: number | null;
  items: OutlineNode[];
}

interface SearchHit {
  page: number;
  snippet: string;
}

const PAGE_GAP = 16;
const ZOOM_STEPS = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];
const KEEP_RENDERED = 4; // pages kept on canvas around the current page
const THEME_FILTER: Record<Theme, string> = {
  light: "none",
  sepia: "sepia(0.45) brightness(0.97)",
  dark: "invert(0.9) hue-rotate(180deg)",
};

function bakeWatermark(canvas: HTMLCanvasElement, text: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  const fontSize = Math.max(12, Math.round(width / 38));
  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = "#0f172a";
  ctx.font = `700 ${fontSize}px sans-serif`;
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 6);
  const stepX = ctx.measureText(text).width + fontSize * 4;
  const stepY = fontSize * 7;
  const span = Math.hypot(width, height);
  for (let y = -span / 2; y < span / 2; y += stepY) {
    for (let x = -span / 2; x < span / 2; x += stepX) {
      ctx.fillText(text, x + ((y / stepY) % 2) * (stepX / 2), y);
    }
  }
  ctx.restore();
}

export function EbookReader({
  ebookId,
  title,
  author,
  watermark,
  initialPage,
  initialBookmarks,
  fileUrl,
  sessionUrl,
  progressUrl,
  backHref = "/member/ebooks",
}: {
  ebookId: string;
  title: string;
  author: string | null;
  watermark: string;
  initialPage: number;
  initialBookmarks: number[];
  fileUrl: string;
  sessionUrl: string | null;
  progressUrl: string | null;
  backHref?: string;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const pageRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const canvasRefs = React.useRef<Array<HTMLCanvasElement | null>>([]);
  const docRef = React.useRef<PDFDocumentProxy | null>(null);
  const tasksRef = React.useRef(new Map<number, RenderTask>());
  const renderedScaleRef = React.useRef(new Map<number, number>());
  const visibleRef = React.useRef(new Set<number>());
  const textCacheRef = React.useRef(new Map<number, string>());
  const currentRef = React.useRef(initialPage);

  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = React.useState("");
  const [loadPct, setLoadPct] = React.useState(0);
  const [numPages, setNumPages] = React.useState(0);
  const [baseSize, setBaseSize] = React.useState({ w: 600, h: 848 });
  const [pageRatios, setPageRatios] = React.useState<Record<number, number>>({});
  const [containerWidth, setContainerWidth] = React.useState(800);
  const [zoom, setZoom] = React.useState(1);
  const [current, setCurrent] = React.useState(initialPage);
  const [pageInput, setPageInput] = React.useState(String(initialPage));
  const [theme, setTheme] = React.useState<Theme>("light");
  const [panel, setPanel] = React.useState<Panel>(null);
  const [outline, setOutline] = React.useState<OutlineNode[] | null>(null);
  const [bookmarks, setBookmarks] = React.useState<number[]>(initialBookmarks);
  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<SearchHit[] | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [chromeHidden, setChromeHidden] = React.useState(false);

  const fitScale = Math.min((containerWidth - 24) / baseSize.w, 1.6);
  const scale = Math.max(0.2, fitScale * zoom);
  const stamp = React.useMemo(
    () => `${watermark} · ${new Date().toLocaleDateString("id-ID")}`,
    [watermark]
  );

  // ---------------------------------------------------------------- persistence
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = React.useRef<{ page: number; total: number; bookmarks: number[] } | null>(null);

  const flushSave = React.useCallback(
    (useBeacon = false) => {
      if (!progressUrl || !pendingSave.current) return;
      const body = JSON.stringify(pendingSave.current);
      pendingSave.current = null;
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(progressUrl, new Blob([body], { type: "application/json" }));
      } else {
        void fetch(progressUrl, { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
      }
    },
    [progressUrl]
  );

  const queueSave = React.useCallback(
    (page: number, marks: number[]) => {
      if (!progressUrl || !numPages) return;
      pendingSave.current = { page, total: numPages, bookmarks: marks };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => flushSave(), 1500);
    },
    [flushSave, numPages, progressUrl]
  );

  React.useEffect(() => {
    const onHide = () => flushSave(true);
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
      flushSave(true);
    };
  }, [flushSave]);

  // ---------------------------------------------------------------- load document
  React.useEffect(() => {
    let cancelled = false;
    let refresh: ReturnType<typeof setInterval> | null = null;
    const tasks = tasksRef.current;

    async function openSession() {
      if (!sessionUrl) return;
      const res = await fetch(sessionUrl, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Tidak bisa membuka ebook.");
      }
    }

    (async () => {
      try {
        await openSession();
        // Renew the 2-hour reading pass well before it expires.
        if (sessionUrl) refresh = setInterval(() => void openSession().catch(() => {}), 90 * 60 * 1000);
        const pdfjs = await loadPdfjs();
        const task = pdfjs.getDocument({
          url: fileUrl,
          withCredentials: true,
          rangeChunkSize: 1024 * 1024,
          disableAutoFetch: true,
          disableStream: true,
          ...pdfAssetOptions(pdfjs.version),
        });
        task.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
          if (total) setLoadPct(Math.min(99, Math.round((loaded / total) * 100)));
        };
        const doc = await task.promise;
        if (cancelled) {
          void doc.destroy();
          return;
        }
        docRef.current = doc;
        const first = await doc.getPage(1);
        const vp = first.getViewport({ scale: 1 });
        setBaseSize({ w: vp.width, h: vp.height });
        setNumPages(doc.numPages);
        const start = Math.min(Math.max(1, initialPage), doc.numPages);
        currentRef.current = start;
        setCurrent(start);
        setPageInput(String(start));
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message || "Ebook gagal dimuat.");
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      if (refresh) clearInterval(refresh);
      tasks.forEach((t) => t.cancel());
      tasks.clear();
      void docRef.current?.destroy();
      docRef.current = null;
    };
  }, [fileUrl, sessionUrl, initialPage]);

  // ---------------------------------------------------------------- layout
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pageHeight = React.useCallback(
    (n: number) => baseSize.w * (pageRatios[n] ?? baseSize.h / baseSize.w) * scale,
    [baseSize, pageRatios, scale]
  );

  const scrollToPage = React.useCallback((n: number, behavior: ScrollBehavior = "auto") => {
    const el = pageRefs.current[n - 1];
    const box = scrollRef.current;
    if (el && box) box.scrollTo({ top: el.offsetTop - 12, behavior });
  }, []);

  // Jump to the saved page once the document is laid out.
  React.useEffect(() => {
    if (status === "ready") requestAnimationFrame(() => scrollToPage(currentRef.current));
  }, [status, scrollToPage]);

  // Keep the reading position when zoom / width changes.
  const prevScale = React.useRef(scale);
  React.useLayoutEffect(() => {
    if (status !== "ready" || prevScale.current === scale) return;
    prevScale.current = scale;
    renderedScaleRef.current.clear();
    scrollToPage(currentRef.current);
  }, [scale, status, scrollToPage]);

  // ---------------------------------------------------------------- rendering
  const renderPage = React.useCallback(
    async (n: number) => {
      const doc = docRef.current;
      const canvas = canvasRefs.current[n - 1];
      if (!doc || !canvas || renderedScaleRef.current.get(n) === scale) return;
      tasksRef.current.get(n)?.cancel();
      try {
        const page = await doc.getPage(n);
        const unit = page.getViewport({ scale: 1 });
        const ratio = unit.height / unit.width;
        if (Math.abs(ratio - baseSize.h / baseSize.w) > 0.01) {
          setPageRatios((prev) => (prev[n] === ratio ? prev : { ...prev, [n]: ratio }));
        }
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        const cssScale = (baseSize.w * scale) / unit.width;
        const viewport = page.getViewport({ scale: cssScale * dpr });
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const task = page.render({ canvas, canvasContext: ctx, viewport });
        tasksRef.current.set(n, task);
        await task.promise;
        tasksRef.current.delete(n);
        bakeWatermark(canvas, stamp);
        renderedScaleRef.current.set(n, scale);
      } catch (err) {
        if ((err as { name?: string }).name !== "RenderingCancelledException") {
          console.warn("[reader] page", n, err);
        }
      }
    },
    [baseSize, scale, stamp]
  );

  const renderVisible = React.useCallback(() => {
    const cur = currentRef.current;
    for (const n of visibleRef.current) void renderPage(n);
    // Free memory: drop canvases far from the reading position.
    for (const n of [...renderedScaleRef.current.keys()]) {
      if (Math.abs(n - cur) > KEEP_RENDERED && !visibleRef.current.has(n)) {
        const c = canvasRefs.current[n - 1];
        if (c) {
          c.width = 0;
          c.height = 0;
        }
        renderedScaleRef.current.delete(n);
      }
    }
  }, [renderPage]);

  React.useEffect(() => {
    if (status !== "ready") return;
    const root = scrollRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const n = Number((e.target as HTMLElement).dataset.page);
          if (e.isIntersecting) visibleRef.current.add(n);
          else visibleRef.current.delete(n);
        }
        renderVisible();
      },
      { root, rootMargin: "120% 0px" }
    );
    pageRefs.current.slice(0, numPages).forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [status, numPages, renderVisible]);

  // Re-render visible pages after zoom settles.
  React.useEffect(() => {
    if (status !== "ready") return;
    const t = setTimeout(renderVisible, 120);
    return () => clearTimeout(t);
  }, [scale, theme, status, renderVisible]);

  // ---------------------------------------------------------------- current page tracking
  const onScroll = React.useCallback(() => {
    const box = scrollRef.current;
    if (!box || !numPages) return;
    const mid = box.scrollTop + box.clientHeight * 0.35;
    let lo = 0;
    let hi = numPages - 1;
    while (lo < hi) {
      const m = (lo + hi + 1) >> 1;
      const el = pageRefs.current[m];
      if (el && el.offsetTop <= mid) lo = m;
      else hi = m - 1;
    }
    const page = lo + 1;
    if (page !== currentRef.current) {
      currentRef.current = page;
      setCurrent(page);
      setPageInput(String(page));
    }
  }, [numPages]);

  const scrollRaf = React.useRef(0);
  const handleScroll = () => {
    cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(onScroll);
  };

  React.useEffect(() => {
    if (status === "ready") queueSave(current, bookmarks);
  }, [current, bookmarks, status, queueSave]);

  const goTo = React.useCallback(
    (n: number) => {
      if (!numPages) return;
      const page = Math.min(Math.max(1, Math.round(n)), numPages);
      currentRef.current = page;
      setCurrent(page);
      setPageInput(String(page));
      scrollToPage(page);
    },
    [numPages, scrollToPage]
  );

  // ---------------------------------------------------------------- zoom / fullscreen
  const zoomBy = React.useCallback((dir: 1 | -1) => {
    setZoom((z) => {
      const idx = ZOOM_STEPS.findIndex((s) => s >= z - 0.001);
      const next = ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, (idx === -1 ? 4 : idx) + dir))];
      return next;
    });
  }, []);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.();
  };
  React.useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // ---------------------------------------------------------------- keyboard & copy protection
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && ["p", "s"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        return;
      }
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (mod && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        zoomBy(1);
      } else if (mod && e.key === "-") {
        e.preventDefault();
        zoomBy(-1);
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        goTo(currentRef.current + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goTo(currentRef.current - 1);
      } else if (e.key === "Home") {
        goTo(1);
      } else if (e.key === "End") {
        goTo(numPages);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, zoomBy, numPages]);

  // ---------------------------------------------------------------- outline
  React.useEffect(() => {
    if (panel !== "toc" || outline !== null || !docRef.current) return;
    const doc = docRef.current;
    (async () => {
      const raw = (await doc.getOutline()) ?? [];
      type RawItem = { title: string; dest: unknown; items: RawItem[] };
      const resolve = async (items: RawItem[]): Promise<OutlineNode[]> =>
        Promise.all(
          items.map(async (it) => {
            let page: number | null = null;
            try {
              const dest = typeof it.dest === "string" ? await doc.getDestination(it.dest) : (it.dest as unknown[] | null);
              if (Array.isArray(dest) && dest[0]) {
                page = (await doc.getPageIndex(dest[0] as Parameters<PDFDocumentProxy["getPageIndex"]>[0])) + 1;
              }
            } catch {
              page = null;
            }
            return { title: it.title, page, items: await resolve(it.items ?? []) };
          })
        );
      setOutline(await resolve(raw as RawItem[]));
    })().catch(() => setOutline([]));
  }, [panel, outline]);

  // ---------------------------------------------------------------- search
  const searchId = React.useRef(0);
  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const doc = docRef.current;
    const q = query.trim().toLowerCase();
    if (!doc || q.length < 2) return;
    const id = ++searchId.current;
    setSearching(true);
    setHits([]);
    const found: SearchHit[] = [];
    for (let n = 1; n <= doc.numPages && id === searchId.current; n++) {
      let text = textCacheRef.current.get(n);
      if (text === undefined) {
        const page = await doc.getPage(n);
        const content = await page.getTextContent();
        text = content.items.map((i) => ("str" in i ? i.str : "")).join(" ").replace(/\s+/g, " ");
        textCacheRef.current.set(n, text);
      }
      const lower = text.toLowerCase();
      let idx = lower.indexOf(q);
      let perPage = 0;
      while (idx !== -1 && perPage < 3) {
        found.push({ page: n, snippet: `…${text.slice(Math.max(0, idx - 40), idx + q.length + 60)}…` });
        perPage += 1;
        idx = lower.indexOf(q, idx + q.length);
      }
      if (n % 5 === 0 || n === doc.numPages) setHits([...found]);
      if (found.length >= 200) break;
    }
    if (id === searchId.current) {
      setHits([...found]);
      setSearching(false);
    }
  }

  const isBookmarked = bookmarks.includes(current);
  const toggleBookmark = () =>
    setBookmarks((prev) => (prev.includes(current) ? prev.filter((p) => p !== current) : [...prev, current].sort((a, b) => a - b)));

  const pct = numPages ? Math.round((current / numPages) * 100) : 0;
  const dark = theme === "dark";

  // ---------------------------------------------------------------- UI
  const iconBtn = cn(
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 transition-colors cursor-pointer disabled:opacity-40",
    dark ? "border-[#334155] text-[#e2e8f0] hover:bg-[#1e293b]" : "border-[#0f172a] bg-white text-[#0f172a] hover:bg-[#ecfeff]"
  );
  const activeBtn = dark ? "bg-[#334155]" : "bg-[#22d3ee] hover:bg-[#22d3ee]";

  return (
    <div
      ref={rootRef}
      className={cn("fixed inset-0 z-40 flex flex-col", dark ? "bg-[#0b1120] text-[#e2e8f0]" : theme === "sepia" ? "bg-[#efe6d2]" : "bg-[#e2e8f0]")}
      onContextMenu={(e) => e.preventDefault()}
    >
      <style>{"@media print{body{display:none!important}}"}</style>

      {/* Top bar */}
      <header
        className={cn(
          "z-20 flex h-14 shrink-0 items-center gap-2 border-b-2 px-2 transition-transform sm:px-3",
          dark ? "border-[#1e293b] bg-[#0f172a]" : "border-[#0f172a] bg-white",
          chromeHidden && "-translate-y-full absolute inset-x-0 top-0"
        )}
      >
        <Link href={backHref} className={iconBtn} aria-label="Kembali ke perpustakaan">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold">{title}</p>
          <p className={cn("truncate text-[11px] font-semibold", dark ? "text-[#94a3b8]" : "text-[#475569]")}>
            {author ? `${author} · ` : ""}
            {numPages ? `${pct}% dibaca` : "Memuat…"}
          </p>
        </div>

        <div className="hidden items-center gap-1.5 md:flex">
          <button type="button" className={iconBtn} onClick={() => zoomBy(-1)} aria-label="Perkecil">
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className={cn("h-9 min-w-[3.5rem] rounded-lg border-2 px-2 text-xs font-extrabold cursor-pointer", dark ? "border-[#334155]" : "border-[#0f172a] bg-white")}
            title="Pas lebar layar"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" className={iconBtn} onClick={() => zoomBy(1)} aria-label="Perbesar">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          className={cn(iconBtn, panel === "search" && activeBtn)}
          onClick={() => setPanel(panel === "search" ? null : "search")}
          aria-label="Cari teks"
        >
          <Search className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={cn(iconBtn, panel === "toc" && activeBtn)}
          onClick={() => setPanel(panel === "toc" ? null : "toc")}
          aria-label="Daftar isi"
        >
          <ListTree className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={cn(iconBtn, isBookmarked && activeBtn)}
          onClick={toggleBookmark}
          onDoubleClick={() => setPanel("bookmarks")}
          aria-label={isBookmarked ? "Hapus penanda halaman" : "Tandai halaman"}
          disabled={!numPages}
        >
          {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        </button>
        <button
          type="button"
          className={cn(iconBtn, "hidden sm:flex")}
          onClick={() => setTheme(theme === "light" ? "sepia" : theme === "sepia" ? "dark" : "light")}
          aria-label="Ganti tema"
          title={`Tema: ${theme === "light" ? "Terang" : theme === "sepia" ? "Sepia" : "Gelap"}`}
        >
          {theme === "light" ? <Sun className="h-4 w-4" /> : theme === "sepia" ? <Sunset className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button type="button" className={cn(iconBtn, "hidden sm:flex")} onClick={toggleFullscreen} aria-label="Layar penuh">
          {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Side panel */}
        {panel && (
          <>
            <div className="fixed inset-0 z-20 bg-[#0f172a]/40 md:hidden" onClick={() => setPanel(null)} />
            <aside
              className={cn(
                "absolute inset-y-0 left-0 z-30 flex w-[min(20rem,85vw)] flex-col border-r-2 md:static md:z-0",
                dark ? "border-[#1e293b] bg-[#0f172a]" : "border-[#0f172a] bg-white"
              )}
            >
              <div className={cn("flex items-center justify-between border-b-2 px-4 py-3", dark ? "border-[#1e293b]" : "border-[#0f172a]")}>
                <div className="flex gap-1">
                  {(["toc", "bookmarks", "search"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPanel(p)}
                      className={cn(
                        "rounded-md border-2 px-2 py-1 text-[11px] font-extrabold cursor-pointer",
                        panel === p
                          ? dark
                            ? "border-[#475569] bg-[#334155]"
                            : "border-[#0f172a] bg-[#22d3ee]"
                          : "border-transparent"
                      )}
                    >
                      {p === "toc" ? "Daftar Isi" : p === "bookmarks" ? `Penanda (${bookmarks.length})` : "Cari"}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => setPanel(null)} aria-label="Tutup panel" className="cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 text-sm">
                {panel === "toc" &&
                  (outline === null ? (
                    <p className="flex items-center gap-2 p-2 text-xs font-semibold"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat daftar isi…</p>
                  ) : outline.length === 0 ? (
                    <p className="p-2 text-xs font-medium opacity-70">Ebook ini tidak memiliki daftar isi.</p>
                  ) : (
                    <OutlineList
                      nodes={outline}
                      dark={dark}
                      onPick={(p) => {
                        goTo(p);
                        if (window.innerWidth < 768) setPanel(null);
                      }}
                    />
                  ))}

                {panel === "bookmarks" &&
                  (bookmarks.length === 0 ? (
                    <p className="p-2 text-xs font-medium opacity-70">
                      Belum ada penanda. Klik ikon <Bookmark className="inline h-3.5 w-3.5" /> di atas untuk menandai halaman.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {bookmarks.map((b) => (
                        <li key={b} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => goTo(b)}
                            className={cn(
                              "flex-1 rounded-lg border-2 px-3 py-2 text-left text-xs font-extrabold cursor-pointer",
                              dark ? "border-[#334155] hover:bg-[#1e293b]" : "border-[#0f172a] hover:bg-[#ecfeff]",
                              b === current && (dark ? "bg-[#1e293b]" : "bg-[#cffafe]")
                            )}
                          >
                            Halaman {b}
                          </button>
                          <button
                            type="button"
                            aria-label={`Hapus penanda halaman ${b}`}
                            onClick={() => setBookmarks((prev) => prev.filter((p) => p !== b))}
                            className="cursor-pointer opacity-60 hover:opacity-100"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ))}

                {panel === "search" && (
                  <div className="space-y-3">
                    <form onSubmit={runSearch} className="flex gap-2">
                      <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Cari kata…"
                        className={cn(
                          "h-9 min-w-0 flex-1 rounded-lg border-2 px-3 text-sm font-medium focus:outline-none",
                          dark ? "border-[#334155] bg-[#0b1120]" : "border-[#0f172a] bg-white"
                        )}
                      />
                      <button type="submit" className={cn(iconBtn, activeBtn)} aria-label="Cari">
                        {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </button>
                    </form>
                    {hits !== null && (
                      <p className="text-[11px] font-bold opacity-70">
                        {searching ? `Mencari… ${hits.length} hasil` : `${hits.length} hasil${hits.length >= 200 ? " (dibatasi 200)" : ""}`}
                      </p>
                    )}
                    <ul className="space-y-1.5">
                      {(hits ?? []).map((h, i) => (
                        <li key={`${h.page}-${i}`}>
                          <button
                            type="button"
                            onClick={() => {
                              goTo(h.page);
                              if (window.innerWidth < 768) setPanel(null);
                            }}
                            className={cn(
                              "w-full rounded-lg border-2 px-3 py-2 text-left cursor-pointer",
                              dark ? "border-[#334155] hover:bg-[#1e293b]" : "border-[#0f172a] hover:bg-[#ecfeff]"
                            )}
                          >
                            <span className="text-[10px] font-black uppercase text-[#a855f7]">Hlm {h.page}</span>
                            <span className="mt-0.5 line-clamp-2 block text-xs font-medium">{h.snippet}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </aside>
          </>
        )}

        {/* Pages */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onClick={(e) => {
            // Tap on empty space toggles the toolbars on phones for distraction-free reading.
            if (window.innerWidth < 768 && e.target === e.currentTarget) setChromeHidden((v) => !v);
          }}
          className="relative min-w-0 flex-1 select-none overflow-auto overscroll-contain"
          style={{ WebkitTouchCallout: "none" } as React.CSSProperties}
        >
          {status === "loading" && (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#a855f7]" />
              <p className="text-sm font-extrabold">Membuka ebook{loadPct ? ` ${loadPct}%` : "…"}</p>
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold opacity-70">
                <ShieldCheck className="h-3.5 w-3.5" /> Dimuat aman dari server, hanya untuk akun Anda
              </p>
            </div>
          )}
          {status === "error" && (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-base font-extrabold">Ebook tidak bisa dibuka</p>
              <p className="max-w-sm text-sm font-medium opacity-80">{error}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-lg border-2 border-[#0f172a] bg-[#22d3ee] px-4 py-2 text-xs font-extrabold text-[#0f172a] shadow-[2px_2px_0px_#0f172a] cursor-pointer"
                >
                  Coba lagi
                </button>
                <Link href={backHref} className="rounded-lg border-2 border-[#0f172a] bg-white px-4 py-2 text-xs font-extrabold text-[#0f172a] shadow-[2px_2px_0px_#0f172a]">
                  Kembali
                </Link>
              </div>
            </div>
          )}
          {status === "ready" && (
            <div className="flex flex-col items-center px-3 py-3" style={{ gap: PAGE_GAP }}>
              {Array.from({ length: numPages }, (_, i) => {
                const n = i + 1;
                const w = baseSize.w * scale;
                const h = pageHeight(n);
                return (
                  <div
                    key={n}
                    data-page={n}
                    ref={(el) => {
                      pageRefs.current[i] = el;
                    }}
                    className="relative shrink-0 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.18)]"
                    style={{ width: w, height: h }}
                  >
                    <canvas
                      ref={(el) => {
                        canvasRefs.current[i] = el;
                      }}
                      className="block h-full w-full"
                      style={{ filter: THEME_FILTER[theme] }}
                      draggable={false}
                    />
                    <span className="pointer-events-none absolute bottom-1.5 right-2 rounded bg-[#0f172a]/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {n}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      {status === "ready" && (
        <footer
          className={cn(
            "z-20 flex h-14 shrink-0 items-center gap-2 border-t-2 px-2 pb-[env(safe-area-inset-bottom)] transition-transform sm:px-3",
            dark ? "border-[#1e293b] bg-[#0f172a]" : "border-[#0f172a] bg-white",
            chromeHidden && "translate-y-full absolute inset-x-0 bottom-0"
          )}
        >
          <button type="button" className={iconBtn} onClick={() => goTo(current - 1)} disabled={current <= 1} aria-label="Halaman sebelumnya">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              goTo(Number(pageInput) || current);
            }}
            className="flex items-center gap-1.5 text-xs font-extrabold"
          >
            <input
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ""))}
              onBlur={() => setPageInput(String(current))}
              inputMode="numeric"
              aria-label="Nomor halaman"
              className={cn(
                "h-9 w-14 rounded-lg border-2 text-center text-sm font-extrabold focus:outline-none",
                dark ? "border-[#334155] bg-[#0b1120]" : "border-[#0f172a] bg-white"
              )}
            />
            <span className="whitespace-nowrap opacity-80">/ {numPages}</span>
          </form>
          <input
            type="range"
            min={1}
            max={numPages}
            value={current}
            onChange={(e) => goTo(Number(e.target.value))}
            aria-label="Geser halaman"
            className="mx-1 h-2 min-w-0 flex-1 cursor-pointer accent-[#a855f7]"
          />
          <div className="flex items-center gap-1.5 md:hidden">
            <button type="button" className={iconBtn} onClick={() => zoomBy(-1)} aria-label="Perkecil">
              <Minus className="h-4 w-4" />
            </button>
            <button type="button" className={iconBtn} onClick={() => zoomBy(1)} aria-label="Perbesar">
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={iconBtn}
              onClick={() => setTheme(theme === "light" ? "sepia" : theme === "sepia" ? "dark" : "light")}
              aria-label="Ganti tema"
            >
              {theme === "light" ? <Sun className="h-4 w-4" /> : theme === "sepia" ? <Sunset className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
          <button type="button" className={iconBtn} onClick={() => goTo(current + 1)} disabled={current >= numPages} aria-label="Halaman berikutnya">
            <ChevronRight className="h-4 w-4" />
          </button>
        </footer>
      )}
      <span className="sr-only" aria-live="polite">
        Halaman {current} dari {numPages} · {ebookId}
      </span>
    </div>
  );
}

function OutlineList({ nodes, dark, onPick, depth = 0 }: { nodes: OutlineNode[]; dark: boolean; onPick: (p: number) => void; depth?: number }) {
  return (
    <ul className={cn("space-y-0.5", depth > 0 && "ml-3 border-l-2 pl-2", depth > 0 && (dark ? "border-[#334155]" : "border-[#cbd5e1]"))}>
      {nodes.map((node, i) => (
        <li key={`${node.title}-${i}`}>
          <button
            type="button"
            disabled={!node.page}
            onClick={() => node.page && onPick(node.page)}
            className={cn(
              "flex w-full items-start justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs cursor-pointer disabled:cursor-default disabled:opacity-60",
              depth === 0 ? "font-extrabold" : "font-semibold",
              dark ? "hover:bg-[#1e293b]" : "hover:bg-[#ecfeff]"
            )}
          >
            <span className="line-clamp-2">{node.title}</span>
            {node.page && <span className="shrink-0 opacity-60">{node.page}</span>}
          </button>
          {node.items.length > 0 && <OutlineList nodes={node.items} dark={dark} onPick={onPick} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}
