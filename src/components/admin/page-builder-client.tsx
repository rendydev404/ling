"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  Eye,
  EyeOff,
  Layers,
  Palette,
  Plus,
  Save,
  Smartphone,
  Trash2,
  User,
} from "lucide-react";
import type {
  BioBlock,
  BioBlockType,
  Product,
  SocialLinkItem,
  StoreSettings,
  ThemeConfig,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import { Card, CustomSwitch, CustomTabs } from "@/components/ui/controls";
import { CustomConfirmDialog, CustomModal } from "@/components/ui/custom-modal";
import { useToast } from "@/components/ui/custom-toast";
import { formatIDR } from "@/lib/utils";

const THEME_PRESETS: Array<{ id: ThemeConfig["preset"]; label: string; config: ThemeConfig }> = [
  {
    id: "clean-light",
    label: "Clean Light",
    config: {
      preset: "clean-light",
      backgroundColor: "#f8fafc",
      surfaceColor: "#ffffff",
      borderColor: "#e2e8f0",
      textColor: "#0f172a",
      mutedTextColor: "#475569",
      accentColor: "#059669",
      accentTextColor: "#ffffff",
      buttonRadius: "xl",
    },
  },
  {
    id: "warm-paper",
    label: "Warm Paper",
    config: {
      preset: "warm-paper",
      backgroundColor: "#faf7f2",
      surfaceColor: "#ffffff",
      borderColor: "#e7e0d4",
      textColor: "#1c1917",
      mutedTextColor: "#57534e",
      accentColor: "#c2410c",
      accentTextColor: "#ffffff",
      buttonRadius: "xl",
    },
  },
  {
    id: "slate-dark",
    label: "Slate Dark",
    config: {
      preset: "slate-dark",
      backgroundColor: "#0f172a",
      surfaceColor: "#1e293b",
      borderColor: "#334155",
      textColor: "#f8fafc",
      mutedTextColor: "#94a3b8",
      accentColor: "#10b981",
      accentTextColor: "#022c22",
      buttonRadius: "xl",
    },
  },
  {
    id: "forest-crisp",
    label: "Forest Crisp",
    config: {
      preset: "forest-crisp",
      backgroundColor: "#f0fdf4",
      surfaceColor: "#ffffff",
      borderColor: "#bbf7d0",
      textColor: "#052e16",
      mutedTextColor: "#166534",
      accentColor: "#15803d",
      accentTextColor: "#ffffff",
      buttonRadius: "md",
    },
  },
  {
    id: "midnight-ink",
    label: "Midnight Ink",
    config: {
      preset: "midnight-ink",
      backgroundColor: "#111827",
      surfaceColor: "#1f2937",
      borderColor: "#374151",
      textColor: "#f9fafb",
      mutedTextColor: "#9ca3af",
      accentColor: "#3b82f6",
      accentTextColor: "#ffffff",
      buttonRadius: "full",
    },
  },
];

export function PageBuilderClient({
  initialSettings,
  initialBlocks,
  products,
  isDemoMode,
}: {
  initialSettings: StoreSettings;
  initialBlocks: BioBlock[];
  products: Product[];
  isDemoMode: boolean;
}) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState("blocks");
  const [settings, setSettings] = React.useState<StoreSettings>(initialSettings);
  const [blocks, setBlocks] = React.useState<BioBlock[]>(initialBlocks);
  const [savingSettings, setSavingSettings] = React.useState(false);

  // Add/Edit Block Modal state
  const [blockModalOpen, setBlockModalOpen] = React.useState(false);
  const [editingBlockId, setEditingBlockId] = React.useState<string | null>(null);
  const [blockType, setBlockType] = React.useState<BioBlockType>("link");
  const [blockTitle, setBlockTitle] = React.useState("");
  const [blockSubtitle, setBlockSubtitle] = React.useState("");
  const [blockUrl, setBlockUrl] = React.useState("");
  const [blockImageUrl, setBlockImageUrl] = React.useState("");
  const [blockProductId, setBlockProductId] = React.useState(products[0]?.id ?? "");
  const [blockBadge, setBlockBadge] = React.useState("");
  const [blockLayout, setBlockLayout] = React.useState<"compact" | "featured">("compact");
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);

  const productMap = React.useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  async function saveStoreSettings() {
    if (isDemoMode) {
      toast({
        type: "info",
        title: "Tersimpan di pratinjau lokal",
        description: "Hubungkan Supabase untuk menyimpan permanen ke database.",
      });
      return;
    }

    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ type: "error", title: "Gagal menyimpan", description: json.error });
        return;
      }
      toast({ type: "success", title: "Pengaturan tampilan disimpan" });
    } finally {
      setSavingSettings(false);
    }
  }

  async function persistBlocks(nextBlocks: BioBlock[]) {
    setBlocks(nextBlocks);
    if (isDemoMode) return;

    const res = await fetch("/api/admin/blocks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks: nextBlocks }),
    });
    if (!res.ok) {
      toast({ type: "error", title: "Gagal menyinkronkan blok ke database" });
    }
  }

  function openNewBlockModal() {
    setEditingBlockId(null);
    setBlockType("link");
    setBlockTitle("");
    setBlockSubtitle("");
    setBlockUrl("");
    setBlockImageUrl("");
    setBlockProductId(products[0]?.id ?? "");
    setBlockBadge("");
    setBlockLayout("compact");
    setBlockModalOpen(true);
  }

  function openEditBlockModal(block: BioBlock) {
    setEditingBlockId(block.id);
    setBlockType(block.type);
    setBlockTitle(block.title ?? "");
    setBlockSubtitle(block.subtitle ?? "");
    setBlockUrl(block.url ?? "");
    setBlockImageUrl(block.image_url ?? "");
    setBlockProductId(block.product_id ?? products[0]?.id ?? "");
    setBlockBadge(block.badge_text ?? "");
    setBlockLayout(block.layout_style);
    setBlockModalOpen(true);
  }

  async function handleSaveBlock() {
    const payload: BioBlock = {
      id: editingBlockId ?? `blk-${Date.now()}`,
      type: blockType,
      title: blockTitle.trim() || null,
      subtitle: blockSubtitle.trim() || null,
      url: blockUrl.trim() || null,
      image_url: blockImageUrl.trim() || null,
      product_id: blockType === "product" ? blockProductId || null : null,
      badge_text: blockBadge.trim() || null,
      layout_style: blockLayout,
      is_active: true,
      sort_order: editingBlockId
        ? blocks.find((b) => b.id === editingBlockId)?.sort_order ?? blocks.length + 1
        : blocks.length + 1,
      click_count: editingBlockId
        ? blocks.find((b) => b.id === editingBlockId)?.click_count ?? 0
        : 0,
      metadata: {},
    };

    const next = editingBlockId
      ? blocks.map((b) => (b.id === editingBlockId ? payload : b))
      : [...blocks, payload];

    await persistBlocks(next);
    setBlockModalOpen(false);
    toast({ type: "success", title: editingBlockId ? "Blok diperbarui" : "Blok ditambahkan" });
  }

  async function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const copy = [...blocks];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    const reordered = copy.map((b, i) => ({ ...b, sort_order: i + 1 }));
    await persistBlocks(reordered);
  }

  async function toggleBlockVisibility(id: string) {
    const next = blocks.map((b) => (b.id === id ? { ...b, is_active: !b.is_active } : b));
    await persistBlocks(next);
  }

  async function confirmDeleteBlock() {
    if (!deleteTargetId) return;
    const next = blocks
      .filter((b) => b.id !== deleteTargetId)
      .map((b, i) => ({ ...b, sort_order: i + 1 }));
    await persistBlocks(next);
    setDeleteTargetId(null);
    toast({ type: "success", title: "Blok dihapus" });
  }

  function addSocialLink() {
    const next: SocialLinkItem[] = [
      ...settings.social_links,
      { platform: "instagram", url: "https://instagram.com/", label: "Instagram" },
    ];
    setSettings({ ...settings, social_links: next });
  }

  const theme = settings.theme_config;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0f172a]">Page Builder & Tema</h1>
          <p className="mt-1 text-sm text-[#64748b]">
            Susun blok Link-in-Bio, profil toko, dan tema solid color dengan pratinjau langsung.
          </p>
        </div>
        <Button onClick={saveStoreSettings} isLoading={savingSettings}>
          <Save className="h-4 w-4" />
          Simpan Perubahan
        </Button>
      </div>

      <CustomTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: "blocks", label: "Blok Halaman Bio", icon: <Layers className="h-3.5 w-3.5" />, badge: blocks.length },
          { id: "profile", label: "Profil & Sosial", icon: <User className="h-3.5 w-3.5" /> },
          { id: "theme", label: "Tema & Warna Solid", icon: <Palette className="h-3.5 w-3.5" /> },
        ]}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Editor Panel */}
        <div className="xl:col-span-7 space-y-4">
          {activeTab === "blocks" && (
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#0f172a]">Daftar Blok Aktif</h2>
                  <p className="text-xs text-[#64748b]">
                    Urutkan link, kartu produk, video embed, banner, atau teks.
                  </p>
                </div>
                <Button size="sm" onClick={openNewBlockModal}>
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Blok
                </Button>
              </div>

              <div className="space-y-2.5">
                {blocks.map((block, idx) => {
                  const linkedProduct = block.product_id ? productMap.get(block.product_id) : null;
                  return (
                    <div
                      key={block.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-white border border-[#e2e8f0] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#475569]">
                            {block.type}
                          </span>
                          <p className="text-sm font-bold text-[#0f172a] truncate">
                            {block.type === "product"
                              ? linkedProduct?.title || "Produk tidak ditemukan"
                              : block.title || (block.type === "divider" ? "Garis Pemisah" : "Tanpa Judul")}
                          </p>
                        </div>
                        {block.url && (
                          <p className="mt-0.5 text-xs text-[#64748b] truncate">{block.url}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveBlock(idx, -1)}
                          disabled={idx === 0}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-[#475569] hover:text-[#0f172a] disabled:opacity-35 cursor-pointer"
                          aria-label="Geser naik"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveBlock(idx, 1)}
                          disabled={idx === blocks.length - 1}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-[#475569] hover:text-[#0f172a] disabled:opacity-35 cursor-pointer"
                          aria-label="Geser turun"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleBlockVisibility(block.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-[#475569] hover:text-[#0f172a] cursor-pointer"
                          aria-label="Toggle visibilitas"
                        >
                          {block.is_active ? (
                            <Eye className="h-3.5 w-3.5 text-[#059669]" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5 text-[#94a3b8]" />
                          )}
                        </button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditBlockModal(block)}
                        >
                          Edit
                        </Button>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetId(block.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#fecaca] bg-white text-[#dc2626] hover:bg-[#fef2f2] cursor-pointer"
                          aria-label="Hapus blok"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {activeTab === "profile" && (
            <Card className="p-5 space-y-4">
              <h2 className="text-sm font-bold text-[#0f172a]">Identitas Brand / Kreator</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nama Brand / Kreator"
                  value={settings.brand_name}
                  onChange={(e) => setSettings({ ...settings, brand_name: e.target.value })}
                />
                <Input
                  label="Handle (@username)"
                  value={settings.handle}
                  onChange={(e) => setSettings({ ...settings, handle: e.target.value })}
                />
              </div>
              <Input
                label="Tagline Singkat"
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
              />
              <Textarea
                label="Bio Storefront"
                value={settings.bio}
                onChange={(e) => setSettings({ ...settings, bio: e.target.value })}
              />
              <Input
                label="URL Foto Avatar (opsional)"
                value={settings.avatar_url ?? ""}
                onChange={(e) => setSettings({ ...settings, avatar_url: e.target.value || null })}
                placeholder="https://..."
              />
              <CustomSwitch
                checked={settings.verified_badge}
                onChange={(checked) => setSettings({ ...settings, verified_badge: checked })}
                label="Tampilkan Badge Terverifikasi"
                description="Menampilkan ikon centang di sebelah nama brand Anda."
              />

              <div className="border-t border-[#e2e8f0] pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                    Tautan Media Sosial
                  </h3>
                  <Button variant="outline" size="sm" onClick={addSocialLink}>
                    <Plus className="h-3.5 w-3.5" />
                    Tambah Sosial
                  </Button>
                </div>
                {settings.social_links.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                    <div className="sm:col-span-4">
                      <CustomSelect
                        value={item.platform}
                        onChange={(val) => {
                          const next = [...settings.social_links];
                          next[idx] = {
                            ...next[idx],
                            platform: val as SocialLinkItem["platform"],
                          };
                          setSettings({ ...settings, social_links: next });
                        }}
                        options={[
                          { value: "instagram", label: "Instagram" },
                          { value: "tiktok", label: "TikTok" },
                          { value: "youtube", label: "YouTube" },
                          { value: "whatsapp", label: "WhatsApp" },
                          { value: "linkedin", label: "LinkedIn" },
                          { value: "twitter", label: "X / Twitter" },
                          { value: "email", label: "Email" },
                          { value: "website", label: "Website" },
                        ]}
                      />
                    </div>
                    <div className="sm:col-span-7">
                      <Input
                        value={item.url}
                        onChange={(e) => {
                          const next = [...settings.social_links];
                          next[idx] = { ...next[idx], url: e.target.value };
                          setSettings({ ...settings, social_links: next });
                        }}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <button
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            social_links: settings.social_links.filter((_, i) => i !== idx),
                          })
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#fecaca] text-[#dc2626] hover:bg-[#fef2f2] cursor-pointer"
                        aria-label="Hapus tautan sosial"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === "theme" && (
            <Card className="p-5 space-y-5">
              <div>
                <h2 className="text-sm font-bold text-[#0f172a]">Preset Tema Solid Color</h2>
                <p className="text-xs text-[#64748b]">
                  Pilih palet warna solid yang bersih, modern, dan berkontras tinggi.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {THEME_PRESETS.map((preset) => {
                  const selected = theme.preset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        setSettings({ ...settings, theme_config: preset.config })
                      }
                      className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                        selected ? "border-[#059669] bg-[#ecfdf5]" : "border-[#e2e8f0] bg-white hover:bg-[#f8fafc]"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-bold text-[#0f172a]">{preset.label}</p>
                        <p className="text-[11px] text-[#64748b]">{preset.config.accentColor}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-5 w-5 rounded-full border border-[#cbd5e1]"
                          style={{ backgroundColor: preset.config.backgroundColor }}
                        />
                        <span
                          className="h-5 w-5 rounded-full border border-[#cbd5e1]"
                          style={{ backgroundColor: preset.config.accentColor }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#e2e8f0]">
                <CustomSelect
                  label="Sudut Tombol & Kartu"
                  value={theme.buttonRadius}
                  onChange={(val) =>
                    setSettings({
                      ...settings,
                      theme_config: {
                        ...theme,
                        buttonRadius: val as ThemeConfig["buttonRadius"],
                      },
                    })
                  }
                  options={[
                    { value: "xl", label: "Modern Rounded (16px)" },
                    { value: "md", label: "Subtle Rounded (8px)" },
                    { value: "full", label: "Pill / Kapsul" },
                    { value: "none", label: "Sharp Minimalist (0px)" },
                  ]}
                />
                <Input
                  label="Warna Aksen Hex"
                  value={theme.accentColor}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      theme_config: { ...theme, accentColor: e.target.value },
                    })
                  }
                />
              </div>
            </Card>
          )}
        </div>

        {/* Right Live Mobile Preview */}
        <div className="xl:col-span-5 xl:sticky xl:top-6">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0f172a]">
                <Smartphone className="h-4 w-4 text-[#059669]" />
                <span>Live Mobile Preview</span>
              </div>
              <span className="text-[11px] font-medium text-[#64748b]">375px</span>
            </div>

            <div
              className="mx-auto max-w-[340px] rounded-[28px] border-4 border-[#0f172a] overflow-hidden shadow-md"
              style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}
            >
              <div className="h-[540px] overflow-y-auto px-4 py-6 space-y-3">
                <div className="flex flex-col items-center text-center">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-extrabold"
                    style={{
                      backgroundColor: theme.accentColor,
                      color: theme.accentTextColor,
                    }}
                  >
                    {settings.brand_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="mt-2.5 flex items-center gap-1">
                    <span className="text-sm font-extrabold">{settings.brand_name}</span>
                    {settings.verified_badge && (
                      <BadgeCheck className="h-4 w-4" style={{ color: theme.accentColor }} />
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed" style={{ color: theme.mutedTextColor }}>
                    {settings.bio}
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  {blocks
                    .filter((b) => b.is_active)
                    .map((block) => {
                      if (block.type === "heading") {
                        return (
                          <p
                            key={block.id}
                            className="pt-2 text-[10px] font-extrabold uppercase tracking-wider"
                            style={{ color: theme.mutedTextColor }}
                          >
                            {block.title}
                          </p>
                        );
                      }
                      if (block.type === "divider") {
                        return (
                          <hr
                            key={block.id}
                            style={{ borderColor: theme.borderColor }}
                          />
                        );
                      }
                      if (block.type === "product" && block.product_id) {
                        const prod = productMap.get(block.product_id);
                        if (!prod) return null;
                        return (
                          <div
                            key={block.id}
                            className="rounded-xl border p-3"
                            style={{
                              backgroundColor: theme.surfaceColor,
                              borderColor: theme.borderColor,
                            }}
                          >
                            <p className="text-xs font-bold leading-snug">{prod.title}</p>
                            <p
                              className="mt-1 text-[11px] font-extrabold"
                              style={{ color: theme.accentColor }}
                            >
                              {formatIDR(prod.price)}
                            </p>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={block.id}
                          className="rounded-xl border px-3 py-2.5 text-xs font-bold"
                          style={{
                            backgroundColor: theme.surfaceColor,
                            borderColor: theme.borderColor,
                          }}
                        >
                          {block.title || "Tautan"}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Add/Edit Block Modal */}
      <CustomModal
        open={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        title={editingBlockId ? "Edit Blok Bio" : "Tambah Blok Bio Baru"}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setBlockModalOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleSaveBlock}>
              Simpan Blok
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <CustomSelect
            label="Tipe Blok"
            value={blockType}
            onChange={(val) => setBlockType(val as BioBlockType)}
            options={[
              { value: "product", label: "Kartu Produk", description: "Tampilkan produk dari katalog Anda" },
              { value: "link", label: "Tombol Link", description: "Tautan eksternal atau internal" },
              { value: "heading", label: "Judul Bagian (Heading)" },
              { value: "text", label: "Blok Teks / Pengumuman" },
              { value: "video", label: "Embed Video (YouTube / Vimeo)" },
              { value: "image", label: "Banner Gambar" },
              { value: "divider", label: "Garis Pemisah" },
            ]}
          />

          {blockType === "product" && (
            <>
              <CustomSelect
                label="Pilih Produk"
                searchable
                value={blockProductId}
                onChange={setBlockProductId}
                options={products.map((p) => ({
                  value: p.id,
                  label: p.title,
                  description: `${p.type.toUpperCase()} · ${formatIDR(p.price)}`,
                }))}
              />
              <CustomSelect
                label="Gaya Kartu"
                value={blockLayout}
                onChange={(v) => setBlockLayout(v as "compact" | "featured")}
                options={[
                  { value: "compact", label: "Compact Card" },
                  { value: "featured", label: "Featured Highlight Card" },
                ]}
              />
              <Input
                label="Label Badge (opsional)"
                value={blockBadge}
                onChange={(e) => setBlockBadge(e.target.value)}
                placeholder="Best Seller, Baru, Promo..."
              />
            </>
          )}

          {blockType !== "product" && blockType !== "divider" && (
            <Input
              label="Judul Blok"
              value={blockTitle}
              onChange={(e) => setBlockTitle(e.target.value)}
              placeholder="Contoh: Bergabung Komunitas"
            />
          )}

          {(blockType === "link" || blockType === "text") && (
            <Textarea
              label="Subjudul / Isi Teks"
              value={blockSubtitle}
              onChange={(e) => setBlockSubtitle(e.target.value)}
              placeholder="Deskripsi singkat..."
            />
          )}

          {(blockType === "link" || blockType === "video" || blockType === "image") && (
            <Input
              label={blockType === "video" ? "URL Video YouTube / Vimeo" : "URL Tujuan"}
              value={blockUrl}
              onChange={(e) => setBlockUrl(e.target.value)}
              placeholder="https://..."
            />
          )}

          {blockType === "image" && (
            <Input
              label="URL Gambar Banner"
              value={blockImageUrl}
              onChange={(e) => setBlockImageUrl(e.target.value)}
              placeholder="https://..."
            />
          )}
        </div>
      </CustomModal>

      <CustomConfirmDialog
        open={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDeleteBlock}
        title="Hapus Blok Bio?"
        description="Blok ini akan dihapus dari halaman Link-in-Bio storefront Anda. Produk terkait di katalog tidak ikut terhapus."
        confirmLabel="Ya, Hapus Blok"
      />
    </div>
  );
}
