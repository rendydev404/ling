"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileCheck2,
  Gift,
  ImagePlus,
  Infinity as InfinityIcon,
  Link2,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, CustomSearchInput } from "@/components/ui/input";
import { Badge, Card, CustomSwitch, CustomTabs, EmptyState } from "@/components/ui/controls";
import { CustomConfirmDialog, CustomModal } from "@/components/ui/custom-modal";
import { CustomDatePicker } from "@/components/ui/custom-date-picker";
import { useToast } from "@/components/ui/custom-toast";
import { cn, formatDateID } from "@/lib/utils";
import { coverUrl, formatBytes, type AdminEbook, type EbookGrant } from "@/lib/ebooks";

export interface ProductOption {
  id: string;
  title: string;
  type: "digital" | "membership";
  status: string;
}

interface InspectedDriveFile {
  fileId: string;
  fileName: string | null;
  fileSizeBytes: number | null;
  thumbPreviewUrl: string;
}

function looksLikeDriveLink(value: string): boolean {
  const v = value.trim();
  return (
    v.includes("drive.google.com") ||
    v.includes("drive.usercontent.google.com") ||
    /^[A-Za-z0-9_-]{20,120}$/.test(v)
  );
}

function driveViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;
}

async function inspectDriveLink(driveUrl: string): Promise<InspectedDriveFile> {
  const res = await fetch("/api/admin/ebooks/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ drive_url: driveUrl }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Gagal memeriksa link Google Drive.");
  return json as InspectedDriveFile;
}

async function uploadCustomCover(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/products/cover", {
    method: "POST",
    body: fd,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.url) {
    throw new Error(json.error ?? "Gagal mengunggah gambar cover.");
  }
  return json.url as string;
}

function titleFromFilename(name: string) {
  return name
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

// ---------------------------------------------------------------------------
// Custom Checkbox Indicator (No native browser checkbox)
// ---------------------------------------------------------------------------
function CustomCheckIndicator({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-[#0f172a] transition-colors",
        checked ? "bg-[#a855f7] text-white" : "bg-white"
      )}
    >
      {checked && <Check className="h-3 w-3 stroke-[3]" />}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------
function EbookCover({
  ebook,
  previewUrl,
  className,
}: {
  ebook?: Pick<AdminEbook, "id" | "title" | "cover_drive_file_id" | "updated_at">;
  previewUrl?: string | null;
  className?: string;
}) {
  const src = previewUrl ?? (ebook?.cover_drive_file_id ? coverUrl(ebook.id, ebook.updated_at) : null);
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
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center">
          <BookOpen className="h-7 w-7 text-[#7e22ce]" />
          <span className="line-clamp-3 text-[11px] font-extrabold text-[#0f172a]">{ebook?.title ?? "Cover Ebook"}</span>
        </div>
      )}
    </div>
  );
}

function ProductPicker({
  products,
  value,
  onChange,
}: {
  products: ProductOption[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-extrabold uppercase tracking-wider text-[#0f172a]">
        Dijual di produk
      </p>
      {products.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-[#0f172a] bg-[#f8fafc] px-3 py-3 text-xs font-medium text-[#475569]">
          Belum ada produk Digital/Membership.{" "}
          <Link href="/admin/products" className="font-extrabold text-[#7e22ce] underline">
            Buat produk dulu
          </Link>{" "}
          agar ebook bisa dibeli. Tanpa produk, ebook hanya bisa dibaca lewat akses gratis.
        </p>
      ) : (
        <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-xl border-2 border-[#0f172a] bg-white p-2">
          {products.map((p) => {
            const checked = value.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggle(p.id)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-2 px-2.5 py-2 text-left text-xs font-bold transition-colors",
                  checked ? "border-[#0f172a] bg-[#cffafe]" : "border-transparent hover:bg-[#f3e8ff]"
                )}
              >
                <CustomCheckIndicator checked={checked} />
                <span className="flex-1 truncate text-[#0f172a]">{p.title}</span>
                <span className="text-[10px] font-extrabold uppercase text-[#7e22ce]">
                  {p.type === "membership" ? "Membership" : "Digital"}
                </span>
                {p.status === "draft" && <span className="text-[10px] font-bold text-[#475569]">draft</span>}
              </button>
            );
          })}
        </div>
      )}
      <p className="text-[11px] text-[#475569]">
        Pembeli produk ini otomatis bisa membaca ebook di reader website. Produk membership membuka ebook selama langganan aktif.
      </p>
    </div>
  );
}

interface FormState {
  title: string;
  author: string;
  description: string;
  pageCount: string;
  published: boolean;
  productIds: string[];
}

function EbookFields({
  form,
  setForm,
  products,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  products: ProductOption[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <Input
          label="Judul ebook"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Contoh: Panduan Jualan Online 2026"
        />
        <Input
          label="Jml halaman (opsional)"
          inputMode="numeric"
          value={form.pageCount}
          onChange={(e) => setForm({ ...form, pageCount: e.target.value.replace(/[^\d]/g, "") })}
          placeholder="Otomatis"
        />
      </div>
      <Input
        label="Penulis (opsional)"
        value={form.author}
        onChange={(e) => setForm({ ...form, author: e.target.value })}
      />
      <Textarea
        label="Deskripsi singkat (opsional)"
        rows={3}
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <ProductPicker
        products={products}
        value={form.productIds}
        onChange={(productIds) => setForm({ ...form, productIds })}
      />
      <CustomSwitch
        checked={form.published}
        onChange={(published) => setForm({ ...form, published })}
        label="Tampilkan di Member Area"
        description="Kalau dimatikan (draft), ebook disembunyikan dari semua member."
      />
    </div>
  );
}

function CoverPicker({
  ebook,
  previewUrl,
  onPick,
  onResetCustom,
  hasCustom,
  hint,
}: {
  ebook?: Pick<AdminEbook, "id" | "title" | "cover_drive_file_id" | "updated_at">;
  previewUrl: string | null;
  onPick: (file: File) => void;
  onResetCustom?: () => void;
  hasCustom?: boolean;
  hint: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <EbookCover ebook={ebook} previewUrl={previewUrl} className="w-full max-w-[180px] shadow-[3px_3px_0px_#0f172a]" />
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap gap-1.5">
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <ImagePlus className="h-3.5 w-3.5" />
          Upload Cover
        </Button>
        {hasCustom && onResetCustom && (
          <Button variant="ghost" size="sm" onClick={onResetCustom}>
            Reset
          </Button>
        )}
      </div>
      <p className="max-w-[180px] text-[11px] leading-relaxed text-[#475569]">{hint}</p>
    </div>
  );
}

function DriveLinkGuide() {
  return (
    <div className="rounded-xl border-2 border-[#0f172a] bg-[#ecfeff] p-3.5 text-xs text-[#0f172a]">
      <div className="flex items-start gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-[#22d3ee]">
          <ShieldCheck className="h-4 w-4 text-[#0f172a]" />
        </span>
        <div className="space-y-1">
          <p className="font-extrabold">Cara menyambungkan PDF dari Google Drive (Tanpa API Key)</p>
          <ol className="list-decimal space-y-0.5 pl-4 font-medium text-[#334155]">
            <li>Upload file PDF Anda ke Google Drive biasa.</li>
            <li>
              Klik kanan file PDF &rarr; <strong>Bagikan (Share)</strong> &rarr; ubah Akses Umum ke{" "}
              <strong>Siapa saja yang memiliki link (Pelihat / Viewer)</strong>.
            </li>
            <li>
              Salin link lalu tempel di bawah. Link asli Google Drive disembunyikan oleh server dan PDF ditampilkan di{" "}
              <strong>Custom Reader</strong> website lengkap dengan watermark member.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

const emptyForm: FormState = {
  title: "",
  author: "",
  description: "",
  pageCount: "",
  published: true,
  productIds: [],
};

// ---------------------------------------------------------------------------
// Add ebook modal (Google Drive Link Mode)
// ---------------------------------------------------------------------------
function AddEbookModal({
  open,
  onClose,
  products,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  products: ProductOption[];
  onCreated: (ebook: AdminEbook) => void;
}) {
  const { toast } = useToast();
  const [driveUrl, setDriveUrl] = React.useState("");
  const [inspected, setInspected] = React.useState<InspectedDriveFile | null>(null);
  const [inspectBusy, setInspectBusy] = React.useState(false);
  const [inspectError, setInspectError] = React.useState<string | null>(null);
  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const [coverPreview, setCoverPreview] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);

  const reset = React.useCallback(() => {
    setDriveUrl("");
    setInspected(null);
    setInspectBusy(false);
    setInspectError(null);
    setCoverFile(null);
    setCoverPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setForm(emptyForm);
    setSaving(false);
  }, []);

  const close = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const pickCustomCover = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ type: "error", title: "Ukuran cover maksimal 5 MB" });
      return;
    }
    setCoverFile(file);
    setCoverPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const clearCustomCover = () => {
    setCoverFile(null);
    setCoverPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const runInspect = React.useCallback(async (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return;
    setInspectBusy(true);
    setInspectError(null);
    try {
      const info = await inspectDriveLink(trimmed);
      setInspected(info);
      if (info.fileName) {
        setForm((prev) => ({
          ...prev,
          title: prev.title.trim() ? prev.title : titleFromFilename(info.fileName!),
        }));
      }
    } catch (err) {
      setInspected(null);
      setInspectError((err as Error).message);
    } finally {
      setInspectBusy(false);
    }
  }, []);

  async function submit() {
    if (!driveUrl.trim()) {
      toast({ type: "error", title: "Tempel link Google Drive terlebih dahulu" });
      return;
    }
    if (form.title.trim().length < 2) {
      toast({ type: "error", title: "Judul ebook wajib diisi" });
      return;
    }
    setSaving(true);
    try {
      let uploadedCoverUrl: string | null = null;
      if (coverFile) {
        uploadedCoverUrl = await uploadCustomCover(coverFile);
      }

      const parsedPages = form.pageCount ? Number(form.pageCount) : null;
      const res = await fetch("/api/admin/ebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drive_url: driveUrl.trim(),
          title: form.title.trim(),
          author: form.author.trim() || null,
          description: form.description.trim() || null,
          page_count: parsedPages && parsedPages > 0 ? parsedPages : null,
          status: form.published ? "published" : "draft",
          product_ids: form.productIds,
          cover_url: uploadedCoverUrl,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan ebook.");
      onCreated(json.ebook as AdminEbook);
      toast({ type: "success", title: "Ebook berhasil ditambahkan", description: form.title });
      reset();
      onClose();
    } catch (err) {
      toast({ type: "error", title: "Gagal menyimpan ebook", description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  const effectivePreview = coverPreview ?? inspected?.thumbPreviewUrl ?? null;

  return (
    <CustomModal
      open={open}
      onClose={close}
      size="xl"
      title="Tambah Ebook dari Google Drive"
      description="File PDF tetap berada di Google Drive Anda, sedangkan member membacanya lewat Custom Reader di website."
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={saving}>
            Batal
          </Button>
          <Button onClick={submit} disabled={!driveUrl.trim() || inspectBusy} isLoading={saving}>
            <Plus className="h-4 w-4" />
            Simpan Ebook
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <DriveLinkGuide />

        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Link PDF Google Drive"
                value={driveUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  setDriveUrl(val);
                  setInspected(null);
                  setInspectError(null);
                }}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData("text");
                  if (looksLikeDriveLink(pasted)) {
                    setTimeout(() => void runInspect(pasted), 50);
                  }
                }}
                placeholder="https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUv/view?usp=sharing"
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => void runInspect(driveUrl)}
              disabled={!driveUrl.trim() || inspectBusy || saving}
              className="sm:h-11"
            >
              {inspectBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Cek Link
            </Button>
          </div>

          {inspectError && (
            <div className="rounded-xl border-2 border-[#be123c] bg-[#ffe4e6] px-3.5 py-2.5 text-xs font-bold text-[#9f1239]">
              {inspectError}
            </div>
          )}

          {inspected && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-[#0f172a] bg-[#cffafe] px-3.5 py-2.5 text-xs">
              <div className="flex min-w-0 items-center gap-2">
                <FileCheck2 className="h-4 w-4 shrink-0 text-[#0e7490]" />
                <span className="truncate font-extrabold text-[#0f172a]">
                  {inspected.fileName ?? `Drive ID: ${inspected.fileId}`}
                </span>
                {inspected.fileSizeBytes ? (
                  <span className="shrink-0 font-bold text-[#334155]">· {formatBytes(inspected.fileSizeBytes)}</span>
                ) : null}
              </div>
              <Badge variant="success">PDF Valid · Siap Dibaca</Badge>
            </div>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-[180px_1fr]">
          <CoverPicker
            ebook={{ id: "", title: form.title || "Cover Ebook", cover_drive_file_id: null, updated_at: "" }}
            previewUrl={effectivePreview}
            onPick={pickCustomCover}
            onResetCustom={clearCustomCover}
            hasCustom={Boolean(coverFile)}
            hint="Otomatis memakai halaman pertama dari Google Drive, atau upload cover custom (JPG/PNG/WebP maks 5 MB)."
          />
          <EbookFields form={form} setForm={setForm} products={products} />
        </div>
      </div>
    </CustomModal>
  );
}

// ---------------------------------------------------------------------------
// Edit modal
// ---------------------------------------------------------------------------
function EditEbookModal({
  ebook,
  products,
  onClose,
  onSaved,
}: {
  ebook: AdminEbook;
  products: ProductOption[];
  onClose: () => void;
  onSaved: (ebook: AdminEbook) => void;
}) {
  const { toast } = useToast();
  const initialDriveUrl = driveViewUrl(ebook.drive_file_id);
  const [driveUrl, setDriveUrl] = React.useState(initialDriveUrl);
  const [inspectBusy, setInspectBusy] = React.useState(false);
  const [inspected, setInspected] = React.useState<InspectedDriveFile | null>(null);
  const [inspectError, setInspectError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(() => ({
    title: ebook.title,
    author: ebook.author ?? "",
    description: ebook.description ?? "",
    pageCount: ebook.page_count ? String(ebook.page_count) : "",
    published: ebook.status === "published",
    productIds: ebook.product_ebooks.map((p) => p.product_id),
  }));
  const [newCover, setNewCover] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview]
  );

  async function checkReplacedLink() {
    if (!driveUrl.trim()) return;
    setInspectBusy(true);
    setInspectError(null);
    try {
      const info = await inspectDriveLink(driveUrl.trim());
      setInspected(info);
    } catch (err) {
      setInspected(null);
      setInspectError((err as Error).message);
    } finally {
      setInspectBusy(false);
    }
  }

  async function save() {
    if (!driveUrl.trim()) {
      toast({ type: "error", title: "Link Google Drive tidak boleh kosong" });
      return;
    }
    if (form.title.trim().length < 2) {
      toast({ type: "error", title: "Judul ebook wajib diisi" });
      return;
    }
    setSaving(true);
    try {
      let coverUrlUpdate: string | undefined;
      if (newCover) {
        coverUrlUpdate = await uploadCustomCover(newCover);
      }

      const parsedPages = form.pageCount ? Number(form.pageCount) : null;
      const linkChanged = driveUrl.trim() !== initialDriveUrl;

      const res = await fetch("/api/admin/ebooks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: ebook.id,
          title: form.title.trim(),
          author: form.author.trim() || null,
          description: form.description.trim() || null,
          page_count: parsedPages && parsedPages > 0 ? parsedPages : null,
          status: form.published ? "published" : "draft",
          product_ids: form.productIds,
          ...(linkChanged ? { drive_url: driveUrl.trim() } : {}),
          ...(coverUrlUpdate ? { cover_url: coverUrlUpdate } : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan.");
      onSaved(json.ebook as AdminEbook);
      toast({ type: "success", title: "Ebook diperbarui" });
      onClose();
    } catch (err) {
      toast({ type: "error", title: "Gagal menyimpan", description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <CustomModal
      open
      onClose={() => !saving && onClose()}
      size="xl"
      title="Edit Ebook"
      description={`${ebook.page_count ? `${ebook.page_count} halaman` : "Halaman otomatis"} · ${formatBytes(ebook.file_size_bytes)}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button onClick={save} isLoading={saving} disabled={inspectBusy}>
            Simpan Perubahan
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Link PDF Google Drive"
                value={driveUrl}
                onChange={(e) => {
                  setDriveUrl(e.target.value);
                  setInspected(null);
                  setInspectError(null);
                }}
                placeholder="https://drive.google.com/file/d/.../view"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={checkReplacedLink}
                disabled={!driveUrl.trim() || inspectBusy || saving}
                className="sm:h-11"
              >
                {inspectBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Cek Link
              </Button>
              <a
                href={driveViewUrl(ebook.drive_file_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border-2 border-[#0f172a] bg-white px-3 text-xs font-extrabold text-[#0f172a] shadow-[3px_3px_0px_#0f172a] hover:bg-[#ecfeff] sm:h-11"
                title="Buka file sumber di Google Drive"
              >
                <ExternalLink className="h-4 w-4" />
                Drive
              </a>
            </div>
          </div>

          {inspectError && (
            <div className="rounded-xl border-2 border-[#be123c] bg-[#ffe4e6] px-3.5 py-2.5 text-xs font-bold text-[#9f1239]">
              {inspectError}
            </div>
          )}

          {inspected && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-[#0f172a] bg-[#cffafe] px-3.5 py-2.5 text-xs">
              <span className="truncate font-extrabold text-[#0f172a]">
                {inspected.fileName ?? inspected.fileId} · {formatBytes(inspected.fileSizeBytes)}
              </span>
              <Badge variant="success">PDF Valid</Badge>
            </div>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-[180px_1fr]">
          <CoverPicker
            ebook={ebook}
            previewUrl={preview ?? inspected?.thumbPreviewUrl ?? null}
            onPick={(f) => {
              if (f.size > 5 * 1024 * 1024) {
                toast({ type: "error", title: "Ukuran cover maksimal 5 MB" });
                return;
              }
              setNewCover(f);
              setPreview((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return URL.createObjectURL(f);
              });
            }}
            onResetCustom={() => {
              setNewCover(null);
              setPreview((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return null;
              });
            }}
            hasCustom={Boolean(newCover)}
            hint="JPG/PNG/WebP/AVIF, maks 5 MB."
          />
          <EbookFields form={form} setForm={setForm} products={products} />
        </div>
      </div>
    </CustomModal>
  );
}

// ---------------------------------------------------------------------------
// Free access (grant) modal
// ---------------------------------------------------------------------------
function GrantModal({
  open,
  onClose,
  ebooks,
  onGranted,
  presetEmail,
}: {
  open: boolean;
  onClose: () => void;
  ebooks: AdminEbook[];
  onGranted: (grants: EbookGrant[], emails: string[], all: boolean, ebookIds: string[]) => void;
  presetEmail?: string;
}) {
  const { toast } = useToast();
  const [emailsText, setEmailsText] = React.useState(presetEmail ?? "");
  const [all, setAll] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [query, setQuery] = React.useState("");
  const [withExpiry, setWithExpiry] = React.useState(false);
  const [expiry, setExpiry] = React.useState("");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const emails = React.useMemo(
    () => [...new Set(emailsText.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))],
    [emailsText]
  );
  const invalid = emails.filter((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  const visible = ebooks.filter((e) => e.title.toLowerCase().includes(query.trim().toLowerCase()));
  const allVisibleSelected = visible.length > 0 && visible.every((e) => selected.includes(e.id));

  async function submit() {
    if (emails.length === 0 || invalid.length) {
      toast({ type: "error", title: invalid.length ? `Email tidak valid: ${invalid[0]}` : "Isi minimal satu email" });
      return;
    }
    if (!all && selected.length === 0) {
      toast({ type: "error", title: "Pilih ebook atau aktifkan 'Semua ebook'" });
      return;
    }
    if (withExpiry && !expiry) {
      toast({ type: "error", title: "Pilih tanggal berakhir" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ebooks/grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails,
          all,
          ebook_ids: all ? [] : selected,
          expires_at: withExpiry && expiry ? new Date(`${expiry}T23:59:59`).toISOString() : null,
          note: note.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal memberi akses.");
      onGranted(json.grants as EbookGrant[], emails, all, selected);
      toast({
        type: "success",
        title: `Akses gratis diberikan ke ${emails.length} email`,
        description:
          json.linkedAccounts < emails.length
            ? `${emails.length - json.linkedAccounts} email belum punya akun; aksesnya aktif setelah mereka daftar & verifikasi email.`
            : undefined,
      });
      onClose();
    } catch (err) {
      toast({ type: "error", title: "Gagal", description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <CustomModal
      open={open}
      onClose={() => !saving && onClose()}
      size="lg"
      title="Beri Akses Baca Gratis"
      description="Member bisa membaca ebook terpilih tanpa membeli."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button variant="secondary" onClick={submit} isLoading={saving}>
            <Gift className="h-4 w-4" />
            Beri Akses
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Textarea
          label="Email member"
          rows={3}
          value={emailsText}
          onChange={(e) => setEmailsText(e.target.value)}
          placeholder={"budi@gmail.com\nsiti@gmail.com"}
          helperText={
            emails.length
              ? `${emails.length} email${invalid.length ? ` · ${invalid.length} tidak valid` : ""}. Pisahkan dengan enter atau koma.`
              : "Bisa banyak sekaligus, pisahkan dengan enter atau koma. Email yang belum punya akun aktif setelah mereka daftar."
          }
        />

        <div className="rounded-xl border-2 border-[#0f172a] bg-[#f8fafc] p-3.5">
          <CustomSwitch
            checked={all}
            onChange={setAll}
            label="Semua ebook"
            description="Termasuk ebook yang Anda tambahkan nanti."
          />
        </div>

        {!all && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#0f172a]">
                Pilih ebook ({selected.length} dipilih)
              </p>
              {visible.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelected(
                      allVisibleSelected
                        ? selected.filter((id) => !visible.some((v) => v.id === id))
                        : [...new Set([...selected, ...visible.map((v) => v.id)])]
                    )
                  }
                  className="cursor-pointer text-xs font-extrabold text-[#7e22ce] hover:underline"
                >
                  {allVisibleSelected ? "Batal pilih semua" : "Pilih semua"}
                </button>
              )}
            </div>
            {ebooks.length > 6 && <CustomSearchInput value={query} onChange={setQuery} placeholder="Cari judul ebook…" />}
            <div className="max-h-60 space-y-1.5 overflow-y-auto rounded-xl border-2 border-[#0f172a] bg-white p-2">
              {visible.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs font-medium text-[#475569]">Tidak ada ebook.</p>
              ) : (
                visible.map((e) => {
                  const checked = selected.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() =>
                        setSelected(checked ? selected.filter((s) => s !== e.id) : [...selected, e.id])
                      }
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3 rounded-lg border-2 px-2.5 py-1.5 text-left transition-colors",
                        checked ? "border-[#0f172a] bg-[#f3e8ff]" : "border-transparent hover:bg-[#f8fafc]"
                      )}
                    >
                      <CustomCheckIndicator checked={checked} />
                      <EbookCover ebook={e} className="w-8 shrink-0 rounded-md border" />
                      <span className="flex-1 truncate text-xs font-bold text-[#0f172a]">{e.title}</span>
                      {e.status === "draft" && <Badge>Draft</Badge>}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className="space-y-3 rounded-xl border-2 border-[#0f172a] bg-[#f8fafc] p-3.5">
          <CustomSwitch
            checked={withExpiry}
            onChange={setWithExpiry}
            label="Batasi masa akses"
            description="Matikan untuk akses selamanya."
          />
          {withExpiry && (
            <CustomDatePicker
              label="Berlaku sampai"
              value={expiry}
              onChange={setExpiry}
              minDate={new Date().toISOString().slice(0, 10)}
            />
          )}
        </div>

        <Input
          label="Catatan (opsional, hanya terlihat admin)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Contoh: hadiah giveaway Instagram"
        />
      </div>
    </CustomModal>
  );
}

// ---------------------------------------------------------------------------
// Main manager
// ---------------------------------------------------------------------------
interface GrantGroup {
  email: string;
  linked: boolean;
  allGrant: EbookGrant | null;
  items: EbookGrant[];
  latest: string;
}

function isExpired(g: EbookGrant) {
  return Boolean(g.expires_at && new Date(g.expires_at).getTime() < Date.now());
}

export function EbooksManager({
  initialEbooks,
  initialGrants,
  products,
}: {
  initialEbooks: AdminEbook[];
  initialGrants: EbookGrant[];
  products: ProductOption[];
}) {
  const { toast } = useToast();
  const [ebooks, setEbooks] = React.useState(initialEbooks);
  const [grants, setGrants] = React.useState(initialGrants);
  const [tab, setTab] = React.useState("ebooks");
  const [query, setQuery] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AdminEbook | null>(null);
  const [deleting, setDeleting] = React.useState<AdminEbook | null>(null);
  const [deleteBusy, setDeleteBusy] = React.useState(false);
  const [grantOpen, setGrantOpen] = React.useState(false);
  const [grantEmail, setGrantEmail] = React.useState<string | undefined>();
  const [revoking, setRevoking] = React.useState<{ id?: string; email?: string; label: string } | null>(null);
  const [revokeBusy, setRevokeBusy] = React.useState(false);

  const productTitle = React.useMemo(() => new Map(products.map((p) => [p.id, p.title])), [products]);
  const ebookTitle = React.useMemo(() => new Map(ebooks.map((e) => [e.id, e.title])), [ebooks]);

  const filteredEbooks = ebooks.filter((e) =>
    `${e.title} ${e.author ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  const grantGroups = React.useMemo<GrantGroup[]>(() => {
    const map = new Map<string, GrantGroup>();
    for (const g of grants) {
      const group =
        map.get(g.email) ?? { email: g.email, linked: false, allGrant: null, items: [], latest: g.created_at };
      group.linked ||= Boolean(g.user_id);
      if (g.ebook_id === null) group.allGrant = g;
      else group.items.push(g);
      if (g.created_at > group.latest) group.latest = g.created_at;
      map.set(g.email, group);
    }
    return [...map.values()].sort((a, b) => b.latest.localeCompare(a.latest));
  }, [grants]);

  const filteredGroups = grantGroups.filter((g) => g.email.includes(query.trim().toLowerCase()));

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/admin/ebooks?id=${deleting.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal menghapus.");
      setEbooks((prev) => prev.filter((e) => e.id !== deleting.id));
      setGrants((prev) => prev.filter((g) => g.ebook_id !== deleting.id));
      toast({ type: "success", title: "Ebook dihapus dari katalog" });
      setDeleting(null);
    } catch (err) {
      toast({ type: "error", title: "Gagal menghapus", description: (err as Error).message });
    } finally {
      setDeleteBusy(false);
    }
  }

  async function confirmRevoke() {
    if (!revoking) return;
    setRevokeBusy(true);
    try {
      const qs = revoking.id ? `id=${revoking.id}` : `email=${encodeURIComponent(revoking.email ?? "")}`;
      const res = await fetch(`/api/admin/ebooks/grants?${qs}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal mencabut akses.");
      setGrants((prev) =>
        prev.filter((g) => (revoking.id ? g.id !== revoking.id : g.email !== revoking.email))
      );
      toast({ type: "success", title: "Akses dicabut" });
      setRevoking(null);
    } catch (err) {
      toast({ type: "error", title: "Gagal", description: (err as Error).message });
    } finally {
      setRevokeBusy(false);
    }
  }

  const publishedCount = ebooks.filter((e) => e.status === "published").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0f172a]">Ebook & Reader</h1>
          <p className="mt-1 text-sm font-medium text-[#475569]">
            Tempel link PDF dari Google Drive, jual lewat produk, dan tampilkan aman lewat Custom Reader di Member Area.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="secondary"
            onClick={() => {
              setGrantEmail(undefined);
              setGrantOpen(true);
            }}
            disabled={ebooks.length === 0}
          >
            <Gift className="h-4 w-4" />
            Beri Akses Gratis
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Tambah Ebook
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { label: "Total ebook", value: ebooks.length, icon: BookOpen, tone: "bg-[#cffafe]" },
          { label: "Tampil di member", value: publishedCount, icon: Eye, tone: "bg-[#f3e8ff]" },
          { label: "Member akses gratis", value: grantGroups.length, icon: Gift, tone: "bg-[#fef9c3]" },
          {
            label: "Mode Reader",
            value: "Drive Proxy",
            icon: ShieldCheck,
            tone: "bg-[#cffafe]",
            sub: "Link Drive tersembunyi",
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-4">
              <div className="flex items-center gap-2.5">
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg border-2 border-[#0f172a]", s.tone)}>
                  <Icon className="h-4 w-4 text-[#0f172a]" />
                </span>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#475569]">{s.label}</p>
              </div>
              <p className="mt-2.5 truncate text-xl font-black text-[#0f172a]">{s.value}</p>
              {"sub" in s && s.sub && <p className="text-[11px] font-bold text-[#475569]">{s.sub}</p>}
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CustomTabs
          activeTab={tab}
          onChange={setTab}
          tabs={[
            { id: "ebooks", label: "Daftar Ebook", icon: <BookOpen className="h-3.5 w-3.5" />, badge: ebooks.length },
            { id: "grants", label: "Akses Gratis", icon: <Gift className="h-3.5 w-3.5" />, badge: grantGroups.length },
          ]}
        />
        <CustomSearchInput
          value={query}
          onChange={setQuery}
          placeholder={tab === "ebooks" ? "Cari judul / penulis…" : "Cari email…"}
          className="sm:max-w-xs"
        />
      </div>

      {tab === "ebooks" &&
        (filteredEbooks.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-5 w-5" />}
            title={ebooks.length ? "Tidak ada ebook yang cocok" : "Belum ada ebook"}
            description={
              ebooks.length
                ? "Coba kata kunci lain."
                : "Tambahkan PDF pertama Anda cukup dengan menempelkan link Google Drive. Pembeli membacanya langsung lewat Custom Reader di website."
            }
            action={
              !ebooks.length ? (
                <Button onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Tambah Ebook
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredEbooks.map((e) => (
              <Card key={e.id} className="flex gap-4 p-4">
                <EbookCover ebook={e} className="w-24 shrink-0 self-start" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-sm font-extrabold text-[#0f172a]">{e.title}</h3>
                    <Badge variant={e.status === "published" ? "success" : "neutral"}>
                      {e.status === "published" ? "Tampil" : "Draft"}
                    </Badge>
                  </div>
                  {e.author && <p className="mt-0.5 truncate text-xs font-medium text-[#475569]">{e.author}</p>}
                  <p className="mt-1 text-[11px] font-bold text-[#475569]">
                    {e.page_count ? `${e.page_count} hlm` : "Hlm otomatis"} · {formatBytes(e.file_size_bytes)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {e.product_ebooks.length === 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#b45309]">
                        <Lock className="h-3 w-3" /> Belum dijual di produk
                      </span>
                    ) : (
                      e.product_ebooks.slice(0, 3).map((p) => (
                        <span
                          key={p.product_id}
                          className="max-w-full truncate rounded-md border border-[#0f172a] bg-[#ecfeff] px-1.5 py-0.5 text-[10px] font-extrabold text-[#0f172a]"
                        >
                          {productTitle.get(p.product_id) ?? "Produk"}
                        </span>
                      ))
                    )}
                    {e.product_ebooks.length > 3 && (
                      <span className="text-[10px] font-extrabold text-[#475569]">+{e.product_ebooks.length - 3}</span>
                    )}
                  </div>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                    <Button size="sm" variant="outline" onClick={() => setEditing(e)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Link
                      href={`/member/baca/${e.id}`}
                      target="_blank"
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border-2 border-[#0f172a] bg-white px-3 text-xs font-extrabold text-[#0f172a] shadow-[3px_3px_0px_#0f172a] hover:bg-[#ecfeff]"
                    >
                      <Eye className="h-3.5 w-3.5" /> Pratinjau
                    </Link>
                    <Button size="icon" variant="ghost" aria-label="Hapus ebook" onClick={() => setDeleting(e)}>
                      <Trash2 className="h-4 w-4 text-[#be123c]" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ))}

      {tab === "grants" &&
        (filteredGroups.length === 0 ? (
          <EmptyState
            icon={<Gift className="h-5 w-5" />}
            title={grantGroups.length ? "Email tidak ditemukan" : "Belum ada akses gratis"}
            description="Beri akses baca tanpa pembelian, misalnya untuk hadiah, tim, atau reviewer. Bisa pilih beberapa ebook atau semua ebook."
            action={
              ebooks.length ? (
                <Button variant="secondary" onClick={() => setGrantOpen(true)}>
                  <Gift className="h-4 w-4" /> Beri Akses Gratis
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredGroups.map((g) => (
              <Card key={g.email} className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-extrabold text-[#0f172a]">{g.email}</p>
                      {g.linked ? (
                        <Badge variant="success">
                          <UserCheck className="h-3 w-3" /> Punya akun
                        </Badge>
                      ) : (
                        <Badge variant="warning">Belum daftar</Badge>
                      )}
                    </div>
                    {g.allGrant ? (
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#0f172a]">
                        <span className="inline-flex items-center gap-1 rounded-md border-2 border-[#0f172a] bg-[#a855f7] px-2 py-0.5 text-white">
                          <InfinityIcon className="h-3.5 w-3.5" /> Semua ebook
                        </span>
                        <GrantMeta grant={g.allGrant} />
                      </div>
                    ) : null}
                    {g.items.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {g.items.map((item) => (
                          <span
                            key={item.id}
                            className={cn(
                              "inline-flex max-w-full items-center gap-1.5 rounded-lg border-2 border-[#0f172a] px-2 py-1 text-[11px] font-bold",
                              isExpired(item) ? "bg-[#f1f5f9] text-[#64748b] line-through" : "bg-[#f3e8ff] text-[#0f172a]"
                            )}
                          >
                            <span className="truncate">{ebookTitle.get(item.ebook_id ?? "") ?? "Ebook"}</span>
                            {item.expires_at && (
                              <span className="font-medium text-[#475569]">s/d {formatDateID(item.expires_at)}</span>
                            )}
                            <button
                              type="button"
                              aria-label="Cabut akses ebook ini"
                              onClick={() =>
                                setRevoking({ id: item.id, label: `${ebookTitle.get(item.ebook_id ?? "") ?? "ebook"} untuk ${g.email}` })
                              }
                              className="cursor-pointer rounded hover:bg-[#fda4af]"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {(g.allGrant?.note || g.items[0]?.note) && (
                      <p className="text-[11px] font-medium text-[#475569]">Catatan: {g.allGrant?.note || g.items[0]?.note}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setGrantEmail(g.email);
                        setGrantOpen(true);
                      }}
                    >
                      <Gift className="h-3.5 w-3.5" /> Tambah
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setRevoking({ email: g.email, label: `semua akses gratis ${g.email}` })}
                    >
                      Cabut semua
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ))}

      <AddEbookModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        products={products}
        onCreated={(e) => setEbooks((prev) => [e, ...prev])}
      />
      {editing && (
        <EditEbookModal
          key={editing.id}
          ebook={editing}
          products={products}
          onClose={() => setEditing(null)}
          onSaved={(e) => setEbooks((prev) => prev.map((x) => (x.id === e.id ? e : x)))}
        />
      )}
      <GrantModal
        key={`${grantOpen}-${grantEmail ?? ""}`}
        open={grantOpen}
        onClose={() => setGrantOpen(false)}
        ebooks={ebooks}
        presetEmail={grantEmail}
        onGranted={(newGrants, emails, all, ebookIds) => {
          setGrants((prev) => [
            ...newGrants,
            ...prev.filter(
              (g) => !emails.includes(g.email) || (!all && !(g.ebook_id && ebookIds.includes(g.ebook_id)))
            ),
          ]);
          setTab("grants");
        }}
      />
      <CustomConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        isLoading={deleteBusy}
        variant="danger"
        title="Hapus ebook dari katalog?"
        description={`"${deleting?.title ?? ""}" akan dihapus dari Member Area dan akses baca member akan dicabut. File PDF asli di Google Drive Anda tetap aman.`}
        confirmLabel="Hapus dari Katalog"
      />
      <CustomConfirmDialog
        open={Boolean(revoking)}
        onClose={() => setRevoking(null)}
        onConfirm={confirmRevoke}
        isLoading={revokeBusy}
        variant="danger"
        title="Cabut akses gratis?"
        description={`Akses ${revoking?.label ?? ""} akan langsung dicabut.`}
        confirmLabel="Cabut Akses"
      />
    </div>
  );
}

function GrantMeta({ grant }: { grant: EbookGrant }) {
  if (isExpired(grant)) return <Badge variant="danger">Kedaluwarsa</Badge>;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#475569]">
      <CheckCircle2 className="h-3.5 w-3.5 text-[#0e7490]" />
      {grant.expires_at ? `Sampai ${formatDateID(grant.expires_at)}` : "Selamanya"}
    </span>
  );
}
