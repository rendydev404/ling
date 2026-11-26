"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Eye,
  FileUp,
  Gift,
  HardDrive,
  ImagePlus,
  Infinity as InfinityIcon,
  Lock,
  Pencil,
  Trash2,
  UploadCloud,
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

// ---------------------------------------------------------------------------
// Drive upload (chunks relayed through our server; the browser never talks to Drive)
// ---------------------------------------------------------------------------
async function uploadToDrive(
  file: Blob,
  meta: { kind: "ebook" | "cover"; name: string; mimeType: string },
  onProgress: (pct: number) => void
): Promise<string> {
  const start = await fetch("/api/admin/ebooks/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...meta, size: file.size }),
  });
  const startJson = await start.json();
  if (!start.ok) throw new Error(startJson.error ?? "Gagal memulai upload.");
  const { sessionUrl, chunkSize } = startJson as { sessionUrl: string; chunkSize: number };

  let offset = 0;
  while (offset < file.size) {
    const end = Math.min(offset + chunkSize, file.size);
    let attempt = 0;
    for (;;) {
      try {
        const res = await fetch("/api/admin/ebooks/upload", {
          method: "PUT",
          headers: {
            "x-upload-session": sessionUrl,
            "content-range": `bytes ${offset}-${end - 1}/${file.size}`,
            "content-type": "application/octet-stream",
          },
          body: file.slice(offset, end),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload gagal.");
        if (json.done) {
          onProgress(100);
          return json.fileId as string;
        }
        offset = Math.max(json.received as number, end);
        onProgress(Math.round((offset / file.size) * 100));
        break;
      } catch (err) {
        attempt += 1;
        if (attempt >= 3) throw err;
        await new Promise((r) => setTimeout(r, 800 * attempt));
      }
    }
  }
  throw new Error("Upload tidak selesai.");
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
  return (
    <div
      className={cn(
        "relative aspect-[3/4] overflow-hidden rounded-xl border-2 border-[#0f172a] bg-[#f3e8ff]",
        className
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center">
          <BookOpen className="h-7 w-7 text-[#7e22ce]" />
          <span className="line-clamp-3 text-[11px] font-extrabold text-[#0f172a]">{ebook?.title ?? "Cover"}</span>
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
              <label
                key={p.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg border-2 px-2.5 py-2 text-xs font-bold",
                  checked ? "border-[#0f172a] bg-[#cffafe]" : "border-transparent hover:bg-[#f3e8ff]"
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(p.id)}
                  className="h-4 w-4 accent-[#a855f7]"
                />
                <span className="flex-1 truncate text-[#0f172a]">{p.title}</span>
                <span className="text-[10px] font-extrabold uppercase text-[#7e22ce]">
                  {p.type === "membership" ? "Membership" : "Digital"}
                </span>
                {p.status === "draft" && <span className="text-[10px] font-bold text-[#475569]">draft</span>}
              </label>
            );
          })}
        </div>
      )}
      <p className="text-[11px] text-[#475569]">
        Pembeli produk ini otomatis bisa membaca ebook. Produk membership membuka ebook selama langganan aktif.
      </p>
    </div>
  );
}

function ProgressBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-extrabold text-[#0f172a]">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-md border-2 border-[#0f172a] bg-[#f1f5f9]">
        <div className="h-full bg-[#22d3ee] transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface FormState {
  title: string;
  author: string;
  description: string;
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
      <Input
        label="Judul ebook"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="Contoh: Panduan Jualan Online 2026"
      />
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
  previewUrl,
  onPick,
  hint,
}: {
  previewUrl: string | null;
  onPick: (file: File) => void;
  hint: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <EbookCover previewUrl={previewUrl} className="w-full max-w-[180px] shadow-[3px_3px_0px_#0f172a]" />
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
      <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        <ImagePlus className="h-3.5 w-3.5" />
        Ganti cover
      </Button>
      <p className="max-w-[180px] text-[11px] text-[#475569]">{hint}</p>
    </div>
  );
}

const emptyForm: FormState = { title: "", author: "", description: "", published: true, productIds: [] };

function titleFromFilename(name: string) {
  return name
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

// ---------------------------------------------------------------------------
// Upload modal
// ---------------------------------------------------------------------------
function UploadEbookModal({
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
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [pageCount, setPageCount] = React.useState<number | null>(null);
  const [cover, setCover] = React.useState<Blob | null>(null);
  const [coverPreview, setCoverPreview] = React.useState<string | null>(null);
  const [inspecting, setInspecting] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [stage, setStage] = React.useState<null | { label: string; pct: number }>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const reset = React.useCallback(() => {
    setFile(null);
    setPageCount(null);
    setCover(null);
    setCoverPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setForm(emptyForm);
    setStage(null);
  }, []);

  const close = () => {
    if (stage) return; // don't abandon an upload midway
    reset();
    onClose();
  };

  const setCoverBlob = (blob: Blob | null) => {
    setCover(blob);
    setCoverPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return blob ? URL.createObjectURL(blob) : null;
    });
  };

  async function pickFile(f: File) {
    if (f.type !== "application/pdf") {
      toast({ type: "error", title: "File harus PDF" });
      return;
    }
    if (f.size > 200 * 1024 * 1024) {
      toast({ type: "error", title: "Maksimal 200 MB" });
      return;
    }
    setFile(f);
    setForm((prev) => ({ ...prev, title: prev.title || titleFromFilename(f.name) }));
    setInspecting(true);
    try {
      const { inspectPdfFile } = await import("@/lib/pdf-client");
      const info = await inspectPdfFile(f);
      setPageCount(info.pageCount);
      setCoverBlob(info.cover);
    } catch {
      toast({ type: "info", title: "Cover otomatis gagal dibuat", description: "Anda bisa unggah cover manual." });
    } finally {
      setInspecting(false);
    }
  }

  async function submit() {
    if (!file) return;
    if (form.title.trim().length < 2) {
      toast({ type: "error", title: "Judul ebook wajib diisi" });
      return;
    }
    try {
      setStage({ label: "Mengunggah PDF ke Google Drive", pct: 0 });
      const driveFileId = await uploadToDrive(
        file,
        { kind: "ebook", name: file.name, mimeType: "application/pdf" },
        (pct) => setStage({ label: "Mengunggah PDF ke Google Drive", pct })
      );

      let coverId: string | null = null;
      if (cover) {
        setStage({ label: "Mengunggah cover", pct: 0 });
        coverId = await uploadToDrive(
          cover,
          { kind: "cover", name: `cover-${file.name}.jpg`, mimeType: cover.type || "image/jpeg" },
          (pct) => setStage({ label: "Mengunggah cover", pct })
        );
      }

      setStage({ label: "Menyimpan ebook", pct: 100 });
      const res = await fetch("/api/admin/ebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          author: form.author.trim() || null,
          description: form.description.trim() || null,
          status: form.published ? "published" : "draft",
          product_ids: form.productIds,
          drive_file_id: driveFileId,
          cover_drive_file_id: coverId,
          page_count: pageCount,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan ebook.");
      onCreated(json.ebook as AdminEbook);
      toast({ type: "success", title: "Ebook berhasil diunggah", description: form.title });
      setStage(null);
      reset();
      onClose();
    } catch (err) {
      setStage(null);
      toast({ type: "error", title: "Upload gagal", description: (err as Error).message });
    }
  }

  return (
    <CustomModal
      open={open}
      onClose={close}
      size="xl"
      title="Upload Ebook"
      description="PDF disimpan privat di Google Drive Anda dan hanya bisa dibaca lewat reader di Member Area."
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={Boolean(stage)}>
            Batal
          </Button>
          <Button onClick={submit} disabled={!file || inspecting} isLoading={Boolean(stage)}>
            <UploadCloud className="h-4 w-4" />
            Upload & Simpan
          </Button>
        </>
      }
    >
      {!file ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void pickFile(f);
          }}
          className={cn(
            "flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#0f172a] px-6 py-14 text-center transition-colors",
            dragOver ? "bg-[#cffafe]" : "bg-[#f8fafc] hover:bg-[#ecfeff]"
          )}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-[#0f172a] bg-[#22d3ee] shadow-[3px_3px_0px_#0f172a]">
            <FileUp className="h-6 w-6 text-[#0f172a]" />
          </span>
          <span className="text-sm font-extrabold text-[#0f172a]">Pilih atau tarik file PDF ke sini</span>
          <span className="text-xs font-medium text-[#475569]">Maksimal 200 MB · cover & jumlah halaman dibaca otomatis</span>
        </button>
      ) : (
        <div className="grid gap-6 md:grid-cols-[180px_1fr]">
          <div className="space-y-3">
            {inspecting ? (
              <div className="flex aspect-[3/4] w-full max-w-[180px] animate-pulse items-center justify-center rounded-xl border-2 border-[#0f172a] bg-[#e2e8f0] text-[11px] font-bold text-[#475569]">
                Membaca PDF…
              </div>
            ) : (
              <CoverPicker
                previewUrl={coverPreview}
                onPick={(f) => setCoverBlob(f)}
                hint="Diambil dari halaman pertama. Ganti jika perlu (JPG/PNG/WebP, maks 5 MB)."
              />
            )}
            <div className="rounded-xl border-2 border-[#0f172a] bg-[#f8fafc] p-2.5 text-[11px] font-bold text-[#334155]">
              <p className="truncate" title={file.name}>
                {file.name}
              </p>
              <p className="mt-0.5 text-[#475569]">
                {formatBytes(file.size)}
                {pageCount ? ` · ${pageCount} halaman` : ""}
              </p>
              {!stage && (
                <button
                  type="button"
                  onClick={reset}
                  className="mt-1.5 inline-flex items-center gap-1 font-extrabold text-[#be123c] hover:underline cursor-pointer"
                >
                  <X className="h-3 w-3" /> Ganti file
                </button>
              )}
            </div>
          </div>
          <div className="space-y-4">
            {stage && <ProgressBar label={stage.label} pct={stage.pct} />}
            <EbookFields form={form} setForm={setForm} products={products} />
          </div>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void pickFile(f);
          e.target.value = "";
        }}
      />
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
  const [form, setForm] = React.useState<FormState>(() => ({
    title: ebook.title,
    author: ebook.author ?? "",
    description: ebook.description ?? "",
    published: ebook.status === "published",
    productIds: ebook.product_ebooks.map((p) => p.product_id),
  }));
  const [newCover, setNewCover] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function save() {
    setSaving(true);
    try {
      let coverId: string | undefined;
      if (newCover) {
        coverId = await uploadToDrive(
          newCover,
          { kind: "cover", name: `cover-${ebook.id}`, mimeType: newCover.type },
          () => {}
        );
      }
      const res = await fetch("/api/admin/ebooks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: ebook.id,
          title: form.title.trim(),
          author: form.author.trim() || null,
          description: form.description.trim() || null,
          status: form.published ? "published" : "draft",
          product_ids: form.productIds,
          ...(coverId ? { cover_drive_file_id: coverId } : {}),
        }),
      });
      const json = await res.json();
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
      description={`${ebook.page_count ?? "?"} halaman · ${formatBytes(ebook.file_size_bytes)}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button onClick={save} isLoading={saving}>
            Simpan Perubahan
          </Button>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-[180px_1fr]">
        <div>
          {preview ? (
            <CoverPicker
              previewUrl={preview}
              onPick={(f) => {
                setNewCover(f);
                setPreview(URL.createObjectURL(f));
              }}
              hint="Cover baru akan disimpan saat Anda klik Simpan."
            />
          ) : (
            <div className="space-y-2">
              <EbookCover ebook={ebook} className="w-full max-w-[180px] shadow-[3px_3px_0px_#0f172a]" />
              <CoverPicker
                previewUrl={null}
                onPick={(f) => {
                  setNewCover(f);
                  setPreview(URL.createObjectURL(f));
                }}
                hint="JPG/PNG/WebP, maks 5 MB."
              />
            </div>
          )}
        </div>
        <EbookFields form={form} setForm={setForm} products={products} />
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
            description="Termasuk ebook yang Anda upload nanti."
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
                  className="text-xs font-extrabold text-[#7e22ce] hover:underline cursor-pointer"
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
                    <label
                      key={e.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg border-2 px-2.5 py-1.5",
                        checked ? "border-[#0f172a] bg-[#f3e8ff]" : "border-transparent hover:bg-[#f8fafc]"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelected(checked ? selected.filter((s) => s !== e.id) : [...selected, e.id])
                        }
                        className="h-4 w-4 accent-[#a855f7]"
                      />
                      <EbookCover ebook={e} className="w-8 shrink-0 rounded-md border" />
                      <span className="flex-1 truncate text-xs font-bold text-[#0f172a]">{e.title}</span>
                      {e.status === "draft" && <Badge>Draft</Badge>}
                    </label>
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
// Drive setup notice
// ---------------------------------------------------------------------------
function DriveSetupNotice() {
  return (
    <Card className="border-[#0f172a] bg-[#fef9c3] p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#0f172a] bg-[#fde047] shadow-[2px_2px_0px_#0f172a]">
          <AlertTriangle className="h-5 w-5 text-[#0f172a]" />
        </span>
        <div className="space-y-1.5 text-sm">
          <p className="font-extrabold text-[#0f172a]">Google Drive belum tersambung</p>
          <p className="text-xs font-medium leading-relaxed text-[#334155]">
            Upload ebook dinonaktifkan sampai environment server berisi{" "}
            <code className="rounded bg-white px-1 font-mono">GOOGLE_DRIVE_FOLDER_ID</code> dan kredensial Google
            (OAuth refresh token atau service account). Jalankan{" "}
            <code className="rounded bg-white px-1 font-mono">npm run drive:auth</code> di komputer Anda untuk membuatnya,
            lalu isi variabelnya di hosting dan deploy ulang.
          </p>
        </div>
      </div>
    </Card>
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
  driveConfigured,
  driveMode,
}: {
  initialEbooks: AdminEbook[];
  initialGrants: EbookGrant[];
  products: ProductOption[];
  driveConfigured: boolean;
  driveMode: "oauth" | "service_account" | null;
}) {
  const { toast } = useToast();
  const [ebooks, setEbooks] = React.useState(initialEbooks);
  const [grants, setGrants] = React.useState(initialGrants);
  const [tab, setTab] = React.useState("ebooks");
  const [query, setQuery] = React.useState("");
  const [uploadOpen, setUploadOpen] = React.useState(false);
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
      toast({
        type: json.driveCleanupFailed ? "info" : "success",
        title: "Ebook dihapus",
        description: json.driveCleanupFailed ? "File di Google Drive gagal dihapus, hapus manual bila perlu." : undefined,
      });
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
            Upload ebook ke Google Drive privat, jual lewat produk, atau beri akses baca gratis ke member.
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
          <Button onClick={() => setUploadOpen(true)} disabled={!driveConfigured}>
            <UploadCloud className="h-4 w-4" />
            Upload Ebook
          </Button>
        </div>
      </div>

      {!driveConfigured && <DriveSetupNotice />}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { label: "Total ebook", value: ebooks.length, icon: BookOpen, tone: "bg-[#cffafe]" },
          { label: "Tampil di member", value: publishedCount, icon: Eye, tone: "bg-[#f3e8ff]" },
          { label: "Member akses gratis", value: grantGroups.length, icon: Gift, tone: "bg-[#fef9c3]" },
          {
            label: "Penyimpanan",
            value: driveConfigured ? "Google Drive" : "Belum aktif",
            icon: HardDrive,
            tone: driveConfigured ? "bg-[#cffafe]" : "bg-[#ffe4e6]",
            sub: driveMode === "service_account" ? "Service account" : driveMode === "oauth" ? "Akun Google (OAuth)" : undefined,
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
                : "Upload PDF pertama Anda. File disimpan privat di Google Drive dan dibaca lewat reader aman."
            }
            action={
              !ebooks.length && driveConfigured ? (
                <Button onClick={() => setUploadOpen(true)}>
                  <UploadCloud className="h-4 w-4" />
                  Upload Ebook
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
                    {e.page_count ? `${e.page_count} hlm` : "-"} · {formatBytes(e.file_size_bytes)}
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
                              className="rounded hover:bg-[#fda4af] cursor-pointer"
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

      <UploadEbookModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
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
        title="Hapus ebook?"
        description={`"${deleting?.title ?? ""}" akan dihapus dari Member Area dan file-nya dihapus dari Google Drive. Member yang sudah membeli tidak bisa membacanya lagi.`}
        confirmLabel="Hapus Permanen"
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
