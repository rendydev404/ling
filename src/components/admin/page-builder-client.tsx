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
import { BrandLogo } from "@/components/ui/brand-logo";
import { useToast } from "@/components/ui/custom-toast";
import { formatIDR } from "@/lib/utils";

const THEME_PRESETS: Array<{ id: ThemeConfig["preset"]; label: string; config: ThemeConfig }> = [
  {
    id: "neo-cyan",
    label: "Neo Cyan & Purple (Default)",
    config: {
      preset: "neo-cyan",
      backgroundColor: "#f4f8fb",
      surfaceColor: "#ffffff",
      borderColor: "#0f172a",
      textColor: "#0f172a",
      mutedTextColor: "#334155",
      accentColor: "#22d3ee",
      accentTextColor: "#0f172a",
      secondaryAccentColor: "#a855f7",
      buttonRadius: "md",
    },
  },
  {
    id: "neo-purple",
    label: "Neo Purple & Cyan",
    config: {
      preset: "neo-purple",
      backgroundColor: "#faf5ff",
      surfaceColor: "#ffffff",
      borderColor: "#0f172a",
      textColor: "#0f172a",
      mutedTextColor: "#334155",
      accentColor: "#a855f7",
      accentTextColor: "#ffffff",
      secondaryAccentColor: "#22d3ee",
      buttonRadius: "md",
    },
  },
  {
    id: "clean-light",
    label: "Crisp Ice Cyan",
    config: {
      preset: "clean-light",
      backgroundColor: "#ecfeff",
      surfaceColor: "#ffffff",
      borderColor: "#0f172a",
      textColor: "#0f172a",
      mutedTextColor: "#334155",
      accentColor: "#06b6d4",
      accentTextColor: "#0f172a",
      secondaryAccentColor: "#9333ea",
      buttonRadius: "xl",
    },
  },
  {
    id: "warm-paper",
    label: "Solar Pop Brutal",
    config: {
      preset: "warm-paper",
      backgroundColor: "#fefce8",
      surfaceColor: "#ffffff",
      borderColor: "#0f172a",
      textColor: "#0f172a",
      mutedTextColor: "#334155",
      accentColor: "#22d3ee",
      accentTextColor: "#0f172a",
      secondaryAccentColor: "#a855f7",
      buttonRadius: "none",
    },
  },
  {
    id: "slate-dark",
    label: "Cyber Slate Dark",
    config: {
      preset: "slate-dark",
      backgroundColor: "#0f172a",
      surfaceColor: "#1e293b",
      borderColor: "#22d3ee",
      textColor: "#f8fafc",
      mutedTextColor: "#cbd5e1",
      accentColor: "#22d3ee",
      accentTextColor: "#0f172a",
      secondaryAccentColor: "#a855f7",
      buttonRadius: "md",
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
                      className="flex items-center justify-between gap-3 rounded-xl border-2 border-[#0f172a] bg-white px-4 py-3 shadow-[3px_3px_0px_#0f172a]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-[#f3e8ff] border-2 border-[#0f172a] px-2 py-0.5 text-[10px] font-black uppercase text-[#0f172a]">
                            {block.type}
                          </span>
                          <p className="text-sm font-black text-[#0f172a] truncate">
                            {block.type === "product"
                              ? linkedProduct?.title || "Produk tidak ditemukan"
                              : block.title || (block.type === "divider" ? "Garis Pemisah" : "Tanpa Judul")}
                          </p>
                        </div>
                        {block.url && (
                          <p className="mt-0.5 text-xs font-semibold text-[#475569] truncate">{block.url}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveBlock(idx, -1)}
                          disabled={idx === 0}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-white text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#ecfeff] disabled:opacity-35 cursor-pointer"
                          aria-label="Geser naik"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveBlock(idx, 1)}
                          disabled={idx === blocks.length - 1}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-white text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#ecfeff] disabled:opacity-35 cursor-pointer"
                          aria-label="Geser turun"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleBlockVisibility(block.id)}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0f172a] shadow-[2px_2px_0px_#0f172a] cursor-pointer ${
                            block.is_active ? "bg-[#67e8f9] text-[#0f172a]" : "bg-[#e2e8f0] text-[#64748b]"
                          }`}
                          aria-label="Toggle visibilitas"
                        >
                          {block.is_active ? (
                            <Eye className="h-3.5 w-3.5" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5" />
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
                          className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-[#ffe4e6] text-[#be123c] shadow-[2px_2px_0px_#0f172a] hover:bg-[#fda4af] cursor-pointer"
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
              <h2 className="text-sm font-black uppercase tracking-wider text-[#0f172a]">Identitas Brand / Kreator</h2>
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

              <div className="border-t-2 border-[#0f172a] pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#0f172a]">
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
                        className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#0f172a] bg-[#ffe4e6] text-[#be123c] shadow-[2px_2px_0px_#0f172a] hover:bg-[#fda4af] cursor-pointer"
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
                <h2 className="text-sm font-black uppercase tracking-wider text-[#0f172a]">Preset Tema Neobrutalism</h2>
                <p className="text-xs font-semibold text-[#475569]">
                  Pilih palet warna Neobrutalism dengan garis tegas dan kontras tinggi (Cyan & Purple).
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
                      className={`flex items-center justify-between rounded-xl border-2 border-[#0f172a] p-3.5 text-left transition-all cursor-pointer ${
                        selected
                          ? "bg-[#ecfeff] shadow-[4px_4px_0px_#0f172a]"
                          : "bg-white hover:bg-[#f4f8fb] shadow-[2px_2px_0px_#0f172a]"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-black text-[#0f172a]">{preset.label}</p>
                        <p className="text-[11px] font-bold text-[#475569]">{preset.config.accentColor}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-5 w-5 rounded-md border-2 border-[#0f172a]"
                          style={{ backgroundColor: preset.config.backgroundColor }}
                        />
                        <span
                          className="h-5 w-5 rounded-md border-2 border-[#0f172a]"
                          style={{ backgroundColor: preset.config.accentColor }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t-2 border-[#0f172a]">
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
                    { value: "md", label: "Neobrutalist Crisp (8px)" },
                    { value: "xl", label: "Rounded Block (16px)" },
                    { value: "full", label: "Pill / Kapsul" },
                    { value: "none", label: "Sharp Brutalist (0px)" },
                  ]}
                />
                <Input
                  label="Warna Aksen Utama (Hex)"
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
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#0f172a]">
                <span className="flex h-6 w-6 items-center justify-center rounded-md border-2 border-[#0f172a] bg-[#22d3ee] shadow-[2px_2px_0px_#0f172a]">
                  <Smartphone className="h-3.5 w-3.5 text-[#0f172a]" />
                </span>
                <span>Live Mobile Preview</span>
              </div>
              <span className="rounded-md border-2 border-[#0f172a] bg-[#f3e8ff] px-2 py-0.5 text-[10px] font-black text-[#0f172a]">
                375px
              </span>
            </div>

            <div
              className="mx-auto max-w-[340px] rounded-[28px] border-4 border-[#0f172a] overflow-hidden shadow-[6px_6px_0px_#0f172a]"
              style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}
            >
              <div className="h-[540px] overflow-y-auto px-4 py-6 space-y-3">
                <div className="flex flex-col items-center text-center">
                  {settings.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={settings.avatar_url}
                      alt={settings.brand_name}
                      className="h-16 w-16 rounded-2xl border-2 border-[#0f172a] object-cover shadow-[3px_3px_0px_#0f172a]"
                    />
                  ) : (
                    <BrandLogo size="lg" />
                  )}
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="text-sm font-black">{settings.brand_name}</span>
                    {settings.verified_badge && (
                      <BadgeCheck className="h-4 w-4" style={{ color: theme.secondaryAccentColor || "#a855f7" }} />
                    )}
                  </div>
                  <p className="mt-1 text-[11px] font-medium leading-relaxed" style={{ color: theme.mutedTextColor }}>
                    {settings.bio}
                  </p>
                </div>

                <div className="space-y-2.5 pt-2">
                  {blocks
                    .filter((b) => b.is_active)
                    .map((block) => {
                      if (block.type === "heading") {
                        return (
                          <p
                            key={block.id}
                            className="pt-2 text-[10px] font-black uppercase tracking-wider"
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
                            className="border-t-2"
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
                            className="rounded-xl border-2 p-3 shadow-[3px_3px_0px_#0f172a]"
                            style={{
                              backgroundColor: theme.surfaceColor,
                              borderColor: theme.borderColor,
                            }}
                          >
                            <p className="text-xs font-black leading-snug">{prod.title}</p>
                            <span
                              className="mt-1.5 inline-block rounded-md border border-[#0f172a] px-2 py-0.5 text-[10px] font-black"
                              style={{
                                backgroundColor: theme.accentColor,
                                color: theme.accentTextColor,
                              }}
                            >
                              {formatIDR(prod.price)}
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={block.id}
                          className="rounded-xl border-2 px-3 py-2.5 text-xs font-black shadow-[3px_3px_0px_#0f172a]"
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
