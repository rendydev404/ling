"use client";

import * as React from "react";
import { Copy, CreditCard, Plus, Radio, Save, Send, ShieldCheck, Trash2 } from "lucide-react";
import type { MidtransConfigSummary } from "@/lib/midtrans";
import type { OutboundWebhook, StoreSettings } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, Card } from "@/components/ui/controls";
import { CustomConfirmDialog, CustomModal } from "@/components/ui/custom-modal";
import { useToast } from "@/components/ui/custom-toast";

export function IntegrationsClient({
  initialSettings,
  initialWebhooks,
  isDemoMode,
  midtransConfig,
}: {
  initialSettings: StoreSettings;
  initialWebhooks: OutboundWebhook[];
  isDemoMode: boolean;
  midtransConfig: MidtransConfigSummary;
}) {
  const { toast } = useToast();
  const [settings, setSettings] = React.useState(initialSettings);
  const [webhooks, setWebhooks] = React.useState(initialWebhooks);
  const [savingPixels, setSavingPixels] = React.useState(false);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [whName, setWhName] = React.useState("");
  const [whUrl, setWhUrl] = React.useState("");
  const [whSecret, setWhSecret] = React.useState("whsec_ling_secret");
  const [deleteTarget, setDeleteTarget] = React.useState<OutboundWebhook | null>(null);

  async function savePixels() {
    if (isDemoMode) return;
    setSavingPixels(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        toast({ type: "error", title: "Gagal menyimpan konfigurasi pixel" });
        return;
      }
      toast({ type: "success", title: "Marketing Pixels & SEO disimpan" });
    } finally {
      setSavingPixels(false);
    }
  }

  async function handleAddWebhook() {
    if (!whName.trim() || !whUrl.trim()) {
      toast({ type: "error", title: "Nama dan Target URL wajib diisi" });
      return;
    }
    if (isDemoMode) return;

    const res = await fetch("/api/admin/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: whName.trim(),
        target_url: whUrl.trim(),
        secret_key: whSecret.trim() || "whsec_ling",
        events: ["order.paid", "order.expired"],
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast({ type: "error", title: "Gagal menambah webhook", description: json.error });
      return;
    }
    setWebhooks((prev) => [json.webhook as OutboundWebhook, ...prev]);
    setModalOpen(false);
    setWhName("");
    setWhUrl("");
    toast({ type: "success", title: "Outbound Webhook ditambahkan" });
  }

  async function testWebhook(wh: OutboundWebhook) {
    const res = await fetch("/api/admin/webhooks/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUrl: wh.target_url, secretKey: wh.secret_key }),
    });
    const json = await res.json();
    if (json.ok) {
      toast({
        type: "success",
        title: `Test Webhook sukses (HTTP ${json.status})`,
      });
    } else {
      toast({
        type: "error",
        title: "Test Webhook gagal",
        description: json.error || `HTTP ${json.status ?? "ERR"}`,
      });
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (!isDemoMode) {
      await fetch(`/api/admin/webhooks?id=${encodeURIComponent(deleteTarget.id)}`, {
        method: "DELETE",
      });
    }
    setWebhooks((prev) => prev.filter((w) => w.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast({ type: "success", title: "Webhook dihapus" });
  }

  function copyWebhookUrl() {
    navigator.clipboard.writeText(midtransConfig.webhookUrl);
    toast({
      type: "success",
      title: "URL Webhook Midtrans disalin",
      description: midtransConfig.webhookUrl,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0f172a]">
          Integrasi Pembayaran, Pixel & Webhooks
        </h1>
        <p className="mt-1 text-sm font-medium text-[#475569]">
          Pantau koneksi Midtrans Payment Gateway, hubungkan Meta/TikTok/GA4 Pixel, serta kelola Outbound Webhooks otomatis.
        </p>
      </div>

      {/* Midtrans Payment Gateway Status Card */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[#0f172a] bg-[#22d3ee] text-[#0f172a] shadow-[3px_3px_0px_#0f172a]">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-[#0f172a]">Midtrans Payment Gateway</h2>
                <Badge variant={midtransConfig.isConfigured ? "success" : "warning"}>
                  {!midtransConfig.isConfigured
                    ? "BELUM DIKONFIGURASI"
                    : midtransConfig.isProduction
                      ? "PRODUCTION LIVE"
                      : "SANDBOX"}
                </Badge>
              </div>
              <p className="text-xs font-medium text-[#475569]">
                QRIS, Virtual Account, E-Wallet & Kartu Kredit via Midtrans Snap + verifikasi SHA-512 Signature Key.
              </p>
            </div>
          </div>
          {midtransConfig.merchantId && (
            <span className="rounded-lg border-2 border-[#0f172a] bg-[#f3e8ff] px-3 py-1.5 font-mono text-xs font-extrabold text-[#0f172a] shadow-[2px_2px_0px_#0f172a]">
              MID: {midtransConfig.merchantId}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl border-2 border-[#0f172a] bg-[#f4f8fb] p-3 shadow-[2px_2px_0px_#0f172a]">
            <span className="font-bold uppercase tracking-wider text-[#475569]">Client Key</span>
            <p className="mt-1 font-mono font-extrabold text-[#0f172a] truncate">
              {midtransConfig.clientKeyMasked ?? "Belum diatur"}
            </p>
          </div>
          <div className="rounded-xl border-2 border-[#0f172a] bg-[#f4f8fb] p-3 shadow-[2px_2px_0px_#0f172a]">
            <span className="font-bold uppercase tracking-wider text-[#475569]">Server Key</span>
            <p className="mt-1 font-mono font-extrabold text-[#0f172a] truncate">
              {midtransConfig.serverKeyMasked ?? "Belum diatur"}
            </p>
          </div>
          <div className="rounded-xl border-2 border-[#0f172a] bg-[#f4f8fb] p-3 shadow-[2px_2px_0px_#0f172a]">
            <span className="font-bold uppercase tracking-wider text-[#475569]">
              Signature Secret Key
            </span>
            <p className="mt-1 font-mono font-extrabold text-[#0f172a] truncate">
              {midtransConfig.signatureKeyMasked ?? "Mengikuti Server Key"}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border-2 border-[#0f172a] bg-[#cffafe] p-3.5 text-xs shadow-[3px_3px_0px_#0f172a]">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-extrabold text-[#0f172a]">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Payment Notification URL (Midtrans Dashboard &rarr; Settings &rarr; Configuration)</span>
            </div>
            <p className="mt-1 font-mono font-semibold text-[#0f172a] truncate">
              {midtransConfig.webhookUrl}
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={copyWebhookUrl}>
            <Copy className="h-3.5 w-3.5" />
            Salin URL
          </Button>
        </div>
      </Card>

      {/* Pixels & SEO Card */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-[#0f172a]">Tracking Pixels & SEO Meta</h2>
            <p className="text-xs font-medium text-[#475569]">
              Script pelacakan otomatis diinjeksi ke halaman bio dan produk.
            </p>
          </div>
          <Button size="sm" onClick={savePixels} isLoading={savingPixels}>
            <Save className="h-3.5 w-3.5" />
            Simpan Pixel
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Meta Pixel ID (Facebook / IG)"
            value={settings.pixels_config.metaPixelId}
            onChange={(e) =>
              setSettings({
                ...settings,
                pixels_config: { ...settings.pixels_config, metaPixelId: e.target.value },
              })
            }
            placeholder="123456789012345"
          />
          <Input
            label="TikTok Pixel ID"
            value={settings.pixels_config.tiktokPixelId}
            onChange={(e) =>
              setSettings({
                ...settings,
                pixels_config: { ...settings.pixels_config, tiktokPixelId: e.target.value },
              })
            }
            placeholder="C9XXXXXXXXXXXX"
          />
          <Input
            label="Google Analytics 4 (GA4 ID)"
            value={settings.pixels_config.ga4MeasurementId}
            onChange={(e) =>
              setSettings({
                ...settings,
                pixels_config: { ...settings.pixels_config, ga4MeasurementId: e.target.value },
              })
            }
            placeholder="G-XXXXXXXXXX"
          />
        </div>
      </Card>

      {/* Outbound Webhooks */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-[#0f172a]">
              Outbound Webhooks (CRM & WhatsApp Automation)
            </h2>
            <p className="text-xs font-medium text-[#475569]">
              Payload ditandatangani dengan header <code>X-Ling-Signature</code> (HMAC-SHA256).
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Tambah Webhook
          </Button>
        </div>

        <div className="space-y-3">
          {webhooks.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-[#0f172a] bg-[#f4f8fb] p-6 text-center text-xs font-semibold text-[#475569]">
              Belum ada Outbound Webhook terdaftar.
            </div>
          ) : (
            webhooks.map((wh) => (
              <div
                key={wh.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border-2 border-[#0f172a] bg-[#f4f8fb] p-4 shadow-[3px_3px_0px_#0f172a]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-[#7e22ce]" />
                    <p className="text-sm font-extrabold text-[#0f172a]">{wh.name}</p>
                    <Badge variant="success">Aktif</Badge>
                  </div>
                  <p className="mt-1 font-mono text-xs font-medium text-[#475569] truncate">
                    {wh.target_url}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => testWebhook(wh)}>
                    <Send className="h-3.5 w-3.5" />
                    Test
                  </Button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(wh)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-[#fda4af] text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#f43f5e] hover:text-white cursor-pointer"
                    aria-label="Hapus webhook"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <CustomModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Tambah Outbound Webhook"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleAddWebhook}>
              Simpan Webhook
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nama Integrasi"
            value={whName}
            onChange={(e) => setWhName(e.target.value)}
            placeholder="Contoh: StarSender WhatsApp / KIRIM.EMAIL / n8n"
          />
          <Input
            label="Endpoint URL (POST)"
            value={whUrl}
            onChange={(e) => setWhUrl(e.target.value)}
            placeholder="https://hook.example.com/order-paid"
          />
          <Input
            label="Signing Secret (HMAC-SHA256)"
            value={whSecret}
            onChange={(e) => setWhSecret(e.target.value)}
          />
        </div>
      </CustomModal>

      <CustomConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Hapus Outbound Webhook?"
        description={`Webhook "${deleteTarget?.name ?? ""}" tidak akan lagi menerima notifikasi transaksi.`}
        confirmLabel="Ya, Hapus"
      />
    </div>
  );
}
