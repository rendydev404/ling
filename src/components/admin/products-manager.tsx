"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import type { Product, ProductStatus, ProductType } from "@/types/database";
import { PRODUCT_TYPE_META, ProductTypeIcon } from "@/components/storefront/product-type-meta";
import { Button } from "@/components/ui/button";
import { CustomSearchInput, Input, Textarea } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import { Badge, Card, CustomSwitch, EmptyState, Pagination } from "@/components/ui/controls";
import { CustomConfirmDialog, CustomModal } from "@/components/ui/custom-modal";
import { useToast } from "@/components/ui/custom-toast";
import { formatIDR, slugify } from "@/lib/utils";

const PAGE_SIZE = 10;

interface ProductFormState {
  id?: string;
  type: ProductType;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  price: string;
  compare_at_price: string;
  is_pay_what_you_want: boolean;
  min_price: string;
  status: ProductStatus;
  is_featured: boolean;
  stock_quantity: string;
  order_bump_product_id: string;
  order_bump_price: string;
  order_bump_headline: string;
  affiliate_enabled: boolean;
  affiliate_commission_pct: string;
  // Type-specific metadata
  delivery_note: string;
  digital_external_url: string;
  duration_minutes: string;
  buffer_minutes: string;
  meeting_platform: string;
  meeting_link: string;
  event_date: string;
  event_location: string;
  event_meeting_url: string;
  weight_grams: string;
  billing_cycle: "monthly" | "quarterly" | "yearly";
  duration_days: string;
  community_link: string;
  benefits_text: string;
}

const EMPTY_FORM: ProductFormState = {
  type: "digital",
  title: "",
  slug: "",
  short_description: "",
  description: "",
  price: "99000",
  compare_at_price: "",
  is_pay_what_you_want: false,
  min_price: "10000",
  status: "published",
  is_featured: false,
  stock_quantity: "",
  order_bump_product_id: "",
  order_bump_price: "",
  order_bump_headline: "",
  affiliate_enabled: true,
  affiliate_commission_pct: "20",
  delivery_note: "",
  digital_external_url: "",
  duration_minutes: "60",
  buffer_minutes: "15",
  meeting_platform: "Google Meet",
  meeting_link: "",
  event_date: "",
  event_location: "Zoom Webinar",
  event_meeting_url: "",
  weight_grams: "300",
  billing_cycle: "monthly",
  duration_days: "30",
  community_link: "",
  benefits_text: "",
};

export function ProductsManager({
  initialProducts,
  isDemoMode,
}: {
  initialProducts: Product[];
  isDemoMode: boolean;
}) {
  const { toast } = useToast();
  const [products, setProducts] = React.useState<Product[]>(initialProducts);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<ProductFormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = React.useState<Product | null>(null);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchType = typeFilter === "all" || p.type === typeFilter;
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [products, search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openCreate() {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setForm({
      id: p.id,
      type: p.type,
      title: p.title,
      slug: p.slug,
      short_description: p.short_description ?? "",
      description: p.description ?? "",
      price: String(p.price),
      compare_at_price: p.compare_at_price !== null ? String(p.compare_at_price) : "",
      is_pay_what_you_want: p.is_pay_what_you_want,
      min_price: String(p.min_price ?? 10000),
      status: p.status,
      is_featured: p.is_featured,
      stock_quantity: p.stock_quantity !== null ? String(p.stock_quantity) : "",
      order_bump_product_id: p.order_bump_product_id ?? "",
      order_bump_price: p.order_bump_price !== null ? String(p.order_bump_price) : "",
      order_bump_headline: p.order_bump_headline ?? "",
      affiliate_enabled: p.affiliate_enabled,
      affiliate_commission_pct: String(p.affiliate_commission_pct),
      delivery_note: p.metadata.delivery_note ?? "",
      digital_external_url: "",
      duration_minutes: String(p.metadata.duration_minutes ?? 60),
      buffer_minutes: String(p.metadata.buffer_minutes ?? 15),
      meeting_platform: p.metadata.meeting_platform ?? "Google Meet",
      meeting_link: p.metadata.meeting_link ?? "",
      event_date: p.metadata.event_date ?? "",
      event_location: p.metadata.event_location ?? "",
      event_meeting_url: p.metadata.event_meeting_url ?? "",
      weight_grams: String(p.metadata.weight_grams ?? 300),
      billing_cycle: p.metadata.billing_cycle ?? "monthly",
      duration_days: String(p.metadata.duration_days ?? 30),
      community_link: p.metadata.community_link ?? "",
      benefits_text: (p.metadata.benefits ?? []).join("\n"),
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast({ type: "error", title: "Judul produk wajib diisi" });
      return;
    }

    const computedSlug = form.slug.trim() ? slugify(form.slug) : slugify(form.title);
    const metadata: Product["metadata"] = {};

    if (form.type === "digital") {
      metadata.delivery_note = form.delivery_note.trim() || undefined;
    } else if (form.type === "appointment") {
      metadata.duration_minutes = Number(form.duration_minutes) || 60;
      metadata.buffer_minutes = Number(form.buffer_minutes) || 15;
      metadata.meeting_platform = form.meeting_platform || "Google Meet";
      metadata.meeting_link = form.meeting_link || undefined;
      metadata.timezone = "Asia/Jakarta";
    } else if (form.type === "event") {
      metadata.event_date = form.event_date || undefined;
      metadata.event_mode = "online";
      metadata.event_location = form.event_location || "Zoom Webinar";
      metadata.event_meeting_url = form.event_meeting_url || undefined;
      metadata.max_capacity = form.stock_quantity ? Number(form.stock_quantity) : 100;
    } else if (form.type === "physical") {
      metadata.weight_grams = Number(form.weight_grams) || 300;
      metadata.requires_shipping = true;
    } else if (form.type === "donation") {
      metadata.preset_amounts = [15000, 25000, 50000, 100000];
      metadata.allow_anonymous = true;
    } else if (form.type === "membership") {
      metadata.billing_cycle = form.billing_cycle;
      metadata.duration_days = Number(form.duration_days) || 30;
      metadata.community_link = form.community_link || undefined;
      metadata.benefits = form.benefits_text
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const payload = {
      id: form.id,
      type: form.type,
      title: form.title.trim(),
      slug: computedSlug,
      short_description: form.short_description.trim() || null,
      description: form.description.trim() || null,
      price: Number(form.price) || 0,
      compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
      is_pay_what_you_want: form.type === "donation" ? true : form.is_pay_what_you_want,
      min_price: Number(form.min_price) || 0,
      status: form.status,
      is_featured: form.is_featured,
      stock_quantity: form.stock_quantity ? Number(form.stock_quantity) : null,
      order_bump_product_id: form.order_bump_product_id || null,
      order_bump_price: form.order_bump_price ? Number(form.order_bump_price) : null,
      order_bump_headline: form.order_bump_headline.trim() || null,
      affiliate_enabled: form.affiliate_enabled,
      affiliate_commission_pct: Number(form.affiliate_commission_pct) || 0,
      metadata,
      digital_external_url: form.digital_external_url.trim() || undefined,
    };

    if (isDemoMode) {
      const localItem: Product = {
        ...payload,
        id: form.id ?? `prod-${Date.now()}`,
        thumbnail_url: null,
        gallery_urls: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setProducts((prev) =>
        form.id ? prev.map((p) => (p.id === form.id ? localItem : p)) : [localItem, ...prev]
      );
      setModalOpen(false);
      toast({ type: "success", title: "Produk tersimpan di pratinjau lokal" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ type: "error", title: "Gagal menyimpan produk", description: json.error });
        return;
      }
      const saved = json.product as Product;
      setProducts((prev) =>
        form.id ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev]
      );
      setModalOpen(false);
      toast({ type: "success", title: form.id ? "Produk diperbarui" : "Produk dibuat" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    if (isDemoMode) {
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast({ type: "success", title: "Produk dihapus dari pratinjau" });
      return;
    }
    const res = await fetch(`/api/admin/products?id=${encodeURIComponent(deleteTarget.id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast({ type: "error", title: "Gagal menghapus produk" });
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast({ type: "success", title: "Produk berhasil dihapus" });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0f172a]">Produk & Layanan</h1>
          <p className="mt-1 text-sm text-[#64748b]">
            Kelola produk digital, kelas online, konsultasi 1-on-1, webinar, fisik, membership, dan donasi.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Tambah Produk
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8">
            <CustomSearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Cari judul atau slug produk..."
            />
          </div>
          <div className="sm:col-span-4">
            <CustomSelect
              value={typeFilter}
              onChange={(v) => {
                setTypeFilter(v);
                setPage(1);
              }}
              options={[
                { value: "all", label: "Semua Tipe Produk" },
                { value: "digital", label: "Produk Digital" },
                { value: "course", label: "Kelas Online (LMS)" },
                { value: "appointment", label: "Konsultasi 1-on-1" },
                { value: "event", label: "Event & Webinar" },
                { value: "physical", label: "Produk Fisik" },
                { value: "membership", label: "Membership" },
                { value: "donation", label: "Donasi & Support" },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {paginated.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Plus className="h-5 w-5" />}
              title="Belum ada produk ditemukan"
              description="Tambahkan produk pertama Anda atau ubah filter pencarian."
              action={
                <Button size="sm" onClick={openCreate}>
                  Tambah Produk Pertama
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {/* Mobile Product Cards */}
            <div className="divide-y-2 divide-[#0f172a] md:hidden">
              {paginated.map((p) => {
                const meta = PRODUCT_TYPE_META[p.type];
                return (
                  <div key={p.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border-2 border-[#0f172a] px-2 py-0.5 text-[10px] font-black shadow-[1px_1px_0px_#0f172a] ${meta.accentBg} ${meta.accentText}`}
                          >
                            <ProductTypeIcon type={p.type} className="h-3 w-3" />
                            {meta.shortLabel}
                          </span>
                          <Badge
                            variant={
                              p.status === "published"
                                ? "success"
                                : p.status === "draft"
                                ? "warning"
                                : "neutral"
                            }
                          >
                            {p.status}
                          </Badge>
                        </div>
                        <p className="text-sm font-black text-[#0f172a] leading-snug">
                          {p.title}
                        </p>
                        <p className="text-[11px] font-semibold text-[#64748b] truncate">
                          /p/{p.slug}
                        </p>
                      </div>
                      <p className="text-sm font-black text-[#0f172a] shrink-0">
                        {formatIDR(p.price)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-bold text-[#475569]">
                        Komisi Affiliate:{" "}
                        <strong className="text-[#0f172a]">
                          {p.affiliate_enabled ? `${p.affiliate_commission_pct}%` : "Off"}
                        </strong>
                      </span>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/p/${p.slug}`}
                          target="_blank"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-white text-[#0f172a] shadow-[2px_2px_0px_#0f172a]"
                          aria-label="Lihat halaman produk"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border-2 border-[#0f172a] bg-[#f3e8ff] px-2.5 text-xs font-black text-[#0f172a] shadow-[2px_2px_0px_#0f172a] cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(p)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-[#ffe4e6] text-[#be123c] shadow-[2px_2px_0px_#0f172a] cursor-pointer"
                          aria-label="Hapus produk"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b-2 border-[#0f172a] bg-[#ecfeff] text-xs font-black uppercase tracking-wider text-[#0f172a]">
                  <tr>
                    <th className="px-5 py-3">Produk</th>
                    <th className="px-5 py-3">Tipe</th>
                    <th className="px-5 py-3">Harga</th>
                    <th className="px-5 py-3">Affiliate</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-[#0f172a]">
                  {paginated.map((p) => {
                    const meta = PRODUCT_TYPE_META[p.type];
                    return (
                      <tr key={p.id} className="hover:bg-[#f4f8fb]">
                        <td className="px-5 py-3.5 max-w-xs">
                          <p className="text-sm font-black text-[#0f172a] truncate">{p.title}</p>
                          <p className="text-xs font-semibold text-[#475569] truncate">/p/{p.slug}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-lg border-2 border-[#0f172a] px-2.5 py-1 text-[11px] font-black shadow-[2px_2px_0px_#0f172a] ${meta.accentBg} ${meta.accentText}`}
                          >
                            <ProductTypeIcon type={p.type} className="h-3.5 w-3.5" />
                            {meta.shortLabel}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs font-black text-[#0f172a]">
                          {formatIDR(p.price)}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-bold text-[#334155]">
                          {p.affiliate_enabled ? `${p.affiliate_commission_pct}%` : "Off"}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge
                            variant={
                              p.status === "published"
                                ? "success"
                                : p.status === "draft"
                                ? "warning"
                                : "neutral"
                            }
                          >
                            {p.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/p/${p.slug}`}
                              target="_blank"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-white text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#ecfeff] transition-colors"
                              aria-label="Lihat halaman produk"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-[#f3e8ff] text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#d8b4fe] transition-colors cursor-pointer"
                              aria-label="Edit produk"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(p)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-[#ffe4e6] text-[#be123c] shadow-[2px_2px_0px_#0f172a] hover:bg-[#fda4af] transition-colors cursor-pointer"
                              aria-label="Hapus produk"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        <div className="px-5 pb-4">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </Card>

      {/* Product Editor Modal */}
      <CustomModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? "Edit Produk" : "Buat Produk / Layanan Baru"}
        description="Konfigurasi detail produk, order bump checkout, dan komisi affiliate."
        size="xl"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleSave} isLoading={saving}>
              Simpan Produk
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CustomSelect
              label="Tipe Produk"
              value={form.type}
              onChange={(v) => setForm({ ...form, type: v as ProductType })}
              options={[
                { value: "digital", label: "Produk Digital", description: "E-book, template, preset, file" },
                { value: "course", label: "Kelas Online (LMS)", description: "Kurikulum modul & lesson" },
                { value: "appointment", label: "Konsultasi 1-on-1", description: "Booking slot jadwal" },
                { value: "event", label: "Event & Webinar", description: "Tiket acara + E-Ticket" },
                { value: "physical", label: "Produk Fisik", description: "Merchandise / buku + ongkir" },
                { value: "membership", label: "Membership", description: "Komunitas & akses berkala" },
                { value: "donation", label: "Donasi & Support", description: "Nominal bebas + pesan" },
              ]}
            />
            <CustomSelect
              label="Status Publikasi"
              value={form.status}
              onChange={(v) => setForm({ ...form, status: v as ProductStatus })}
              options={[
                { value: "published", label: "Published (Tampil di Toko)" },
                { value: "draft", label: "Draft (Tersembunyi)" },
                { value: "archived", label: "Archived" },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Judul Produk"
              required
              value={form.title}
              onChange={(e) =>
                setForm({
                  ...form,
                  title: e.target.value,
                  slug: form.id ? form.slug : slugify(e.target.value),
                })
              }
              placeholder="Masukkan judul produk"
            />
            <Input
              label="URL Slug"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
              placeholder="nama-produk-anda"
            />
          </div>

          <Input
            label="Deskripsi Singkat (Tampil di Kartu Bio)"
            value={form.short_description}
            onChange={(e) => setForm({ ...form, short_description: e.target.value })}
            placeholder="Ringkasan 1-2 kalimat..."
          />

          <Textarea
            label="Deskripsi Lengkap"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Jelaskan manfaat, isi produk, dan siapa yang cocok membeli..."
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Harga (IDR)"
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <Input
              label="Harga Coret / Normal (Opsional)"
              type="number"
              value={form.compare_at_price}
              onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })}
            />
            <Input
              label="Stok / Kuota (Kosongkan = Unlimited)"
              type="number"
              value={form.stock_quantity}
              onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
            />
          </div>

          {/* Type-specific settings */}
          {form.type === "digital" && (
            <div className="rounded-xl border-2 border-[#0f172a] bg-[#ecfeff] p-4 space-y-3 shadow-[3px_3px_0px_#0f172a]">
              <p className="text-xs font-black uppercase tracking-wider text-[#0f172a]">
                Pengaturan Produk Digital
              </p>
              <Input
                label="Link Akses Eksternal (Notion / Drive / File URL)"
                value={form.digital_external_url}
                onChange={(e) => setForm({ ...form, digital_external_url: e.target.value })}
                placeholder="https://..."
              />
              <Input
                label="Catatan Pengiriman Pasca-Bayar"
                value={form.delivery_note}
                onChange={(e) => setForm({ ...form, delivery_note: e.target.value })}
                placeholder="Link file langsung muncul di Member Area..."
              />
            </div>
          )}

          {form.type === "appointment" && (
            <div className="rounded-xl border-2 border-[#0f172a] bg-[#fef08a]/50 p-4 space-y-3 shadow-[3px_3px_0px_#0f172a]">
              <p className="text-xs font-black uppercase tracking-wider text-[#0f172a]">
                Pengaturan Jadwal 1-on-1
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Durasi Sesi (menit)"
                  type="number"
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                />
                <Input
                  label="Jeda / Buffer (menit)"
                  type="number"
                  value={form.buffer_minutes}
                  onChange={(e) => setForm({ ...form, buffer_minutes: e.target.value })}
                />
                <Input
                  label="Platform Meeting"
                  value={form.meeting_platform}
                  onChange={(e) => setForm({ ...form, meeting_platform: e.target.value })}
                />
              </div>
              <Input
                label="Link Meeting (Zoom / Google Meet)"
                value={form.meeting_link}
                onChange={(e) => setForm({ ...form, meeting_link: e.target.value })}
                placeholder="https://meet.google.com/..."
              />
            </div>
          )}

          {form.type === "event" && (
            <div className="rounded-xl border-2 border-[#0f172a] bg-[#f3e8ff] p-4 space-y-3 shadow-[3px_3px_0px_#0f172a]">
              <p className="text-xs font-black uppercase tracking-wider text-[#0f172a]">
                Pengaturan Event & Webinar
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Tanggal & Jam (ISO / WIB)"
                  value={form.event_date}
                  onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                  placeholder="YYYY-MM-DDTHH:MM:00+07:00"
                />
                <Input
                  label="Lokasi / Platform"
                  value={form.event_location}
                  onChange={(e) => setForm({ ...form, event_location: e.target.value })}
                />
              </div>
              <Input
                label="Link Webinar (Dibuka setelah lunas)"
                value={form.event_meeting_url}
                onChange={(e) => setForm({ ...form, event_meeting_url: e.target.value })}
              />
            </div>
          )}

          {form.type === "physical" && (
            <div className="rounded-xl border-2 border-[#0f172a] bg-[#f4f8fb] p-4 space-y-3 shadow-[3px_3px_0px_#0f172a]">
              <p className="text-xs font-black uppercase tracking-wider text-[#0f172a]">
                Pengaturan Produk Fisik
              </p>
              <Input
                label="Berat Barang (gram)"
                type="number"
                value={form.weight_grams}
                onChange={(e) => setForm({ ...form, weight_grams: e.target.value })}
              />
            </div>
          )}

          {form.type === "membership" && (
            <div className="rounded-xl border-2 border-[#0f172a] bg-[#f3e8ff] p-4 space-y-3 shadow-[3px_3px_0px_#0f172a]">
              <p className="text-xs font-black uppercase tracking-wider text-[#0f172a]">
                Pengaturan Membership
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CustomSelect
                  label="Siklus Tagihan"
                  value={form.billing_cycle}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      billing_cycle: v as "monthly" | "quarterly" | "yearly",
                      duration_days: v === "yearly" ? "365" : v === "quarterly" ? "90" : "30",
                    })
                  }
                  options={[
                    { value: "monthly", label: "Bulanan (30 Hari)" },
                    { value: "quarterly", label: "Triwulanan (90 Hari)" },
                    { value: "yearly", label: "Tahunan (365 Hari)" },
                  ]}
                />
                <Input
                  label="Link Grup Komunitas (Telegram / WA)"
                  value={form.community_link}
                  onChange={(e) => setForm({ ...form, community_link: e.target.value })}
                  placeholder="https://t.me/+..."
                />
              </div>
              <Textarea
                label="Daftar Benefit (1 baris per benefit)"
                value={form.benefits_text}
                onChange={(e) => setForm({ ...form, benefits_text: e.target.value })}
              />
            </div>
          )}

          {/* Order Bump & Affiliate */}
          <div className="rounded-xl border-2 border-[#0f172a] bg-white p-4 space-y-4 shadow-[3px_3px_0px_#0f172a]">
            <p className="text-xs font-black uppercase tracking-wider text-[#0f172a]">
              Optimasi Konversi: Order Bump & Affiliate
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CustomSelect
                label="Produk Order Bump (Opsional)"
                value={form.order_bump_product_id}
                onChange={(v) => setForm({ ...form, order_bump_product_id: v })}
                options={[
                  { value: "", label: "Tanpa Order Bump" },
                  ...products
                    .filter((p) => p.id !== form.id)
                    .map((p) => ({
                      value: p.id,
                      label: p.title,
                      description: formatIDR(p.price),
                    })),
                ]}
              />
              <Input
                label="Harga Promo Order Bump (IDR)"
                type="number"
                value={form.order_bump_price}
                onChange={(e) => setForm({ ...form, order_bump_price: e.target.value })}
                placeholder="0"
              />
            </div>
            <Input
              label="Headline Penawaran Order Bump"
              value={form.order_bump_headline}
              onChange={(e) => setForm({ ...form, order_bump_headline: e.target.value })}
              placeholder="Tambahkan bonus pendamping..."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2 border-t-2 border-[#0f172a]">
              <CustomSwitch
                checked={form.affiliate_enabled}
                onChange={(checked) => setForm({ ...form, affiliate_enabled: checked })}
                label="Aktifkan Komisi Affiliate"
                description="Izinkan partner mempromosikan produk ini."
              />
              <Input
                label="Persentase Komisi (%)"
                type="number"
                disabled={!form.affiliate_enabled}
                value={form.affiliate_commission_pct}
                onChange={(e) => setForm({ ...form, affiliate_commission_pct: e.target.value })}
              />
            </div>
          </div>
        </div>
      </CustomModal>

      <CustomConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Produk?"
        description={`Produk "${deleteTarget?.title ?? ""}" akan dihapus dari katalog. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus Produk"
      />
    </div>
  );
}
