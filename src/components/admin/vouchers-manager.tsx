"use client";

import * as React from "react";
import { Plus, Tag, Trash2 } from "lucide-react";
import type { Voucher } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import { CustomDatePicker } from "@/components/ui/custom-date-picker";
import { Badge, Card, CustomSwitch, EmptyState } from "@/components/ui/controls";
import { CustomConfirmDialog, CustomModal } from "@/components/ui/custom-modal";
import { useToast } from "@/components/ui/custom-toast";
import { formatDateID, formatIDR } from "@/lib/utils";

export function VouchersManager({
  initialVouchers,
  isDemoMode,
}: {
  initialVouchers: Voucher[];
  isDemoMode: boolean;
}) {
  const { toast } = useToast();
  const [vouchers, setVouchers] = React.useState<Voucher[]>(initialVouchers);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Voucher | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [code, setCode] = React.useState("");
  const [discountType, setDiscountType] = React.useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = React.useState("20");
  const [maxDiscount, setMaxDiscount] = React.useState("50000");
  const [minOrder, setMinOrder] = React.useState("50000");
  const [maxUses, setMaxUses] = React.useState("100");
  const [expiresAt, setExpiresAt] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);

  async function handleCreate() {
    if (!code.trim()) {
      toast({ type: "error", title: "Kode voucher wajib diisi" });
      return;
    }

    const payload = {
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: Number(discountValue) || 0,
      max_discount_amount: discountType === "percentage" && maxDiscount ? Number(maxDiscount) : null,
      min_order_amount: Number(minOrder) || 0,
      max_uses: maxUses ? Number(maxUses) : null,
      expires_at: expiresAt ? `${expiresAt}T23:59:59+07:00` : null,
      is_active: isActive,
    };

    if (isDemoMode) {
      const localVoucher: Voucher = {
        ...payload,
        id: `vch-${Date.now()}`,
        used_count: 0,
        applicable_product_id: null,
        starts_at: null,
        created_at: new Date().toISOString(),
      };
      setVouchers((prev) => [localVoucher, ...prev]);
      setModalOpen(false);
      setCode("");
      toast({ type: "success", title: "Voucher dibuat di mode pratinjau" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ type: "error", title: "Gagal membuat voucher", description: json.error });
        return;
      }
      setVouchers((prev) => [json.voucher as Voucher, ...prev]);
      setModalOpen(false);
      setCode("");
      toast({ type: "success", title: "Voucher berhasil dibuat" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    if (!isDemoMode) {
      await fetch(`/api/admin/vouchers?id=${encodeURIComponent(deleteTarget.id)}`, {
        method: "DELETE",
      });
    }
    setVouchers((prev) => prev.filter((v) => v.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast({ type: "success", title: "Voucher dihapus" });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0f172a]">Voucher & Kupon Diskon</h1>
          <p className="mt-1 text-sm text-[#64748b]">
            Buat kode promo diskon persentase atau nominal tetap untuk meningkatkan konversi checkout.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Buat Voucher
        </Button>
      </div>

      <Card className="overflow-hidden">
        {vouchers.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Tag className="h-5 w-5" />}
              title="Belum ada voucher promo"
              description="Buat kode kupon pertama seperti HEMAT20 untuk mendorong konversi pelanggan."
              action={
                <Button size="sm" onClick={() => setModalOpen(true)}>
                  Buat Voucher Pertama
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {/* Mobile Voucher Cards */}
            <div className="divide-y-2 divide-[#0f172a] md:hidden">
              {vouchers.map((v) => (
                <div key={v.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md border-2 border-[#0f172a] bg-[#67e8f9] px-2.5 py-0.5 font-mono text-xs font-black text-[#0f172a] shadow-[2px_2px_0px_#0f172a]">
                      {v.code}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant={v.is_active ? "success" : "neutral"}>
                        {v.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(v)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-[#fda4af] text-[#0f172a] shadow-[2px_2px_0px_#0f172a] cursor-pointer"
                        aria-label="Hapus voucher"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-[#0f172a]">
                      Potongan:{" "}
                      {v.discount_type === "percentage"
                        ? `${v.discount_value}%`
                        : formatIDR(v.discount_value)}
                    </span>
                    <span className="font-bold text-[#475569]">
                       Terpakai {v.used_count}/{v.max_uses ?? "∞"}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-[#64748b]">
                    Min. belanja {formatIDR(v.min_order_amount)} · Berakhir:{" "}
                    {v.expires_at ? formatDateID(v.expires_at) : "Selamanya"}
                  </p>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b-2 border-[#0f172a] bg-[#ecfeff] text-xs font-extrabold uppercase tracking-wider text-[#0f172a]">
                  <tr>
                    <th className="px-5 py-3">Kode</th>
                    <th className="px-5 py-3">Potongan</th>
                    <th className="px-5 py-3">Min. Belanja</th>
                    <th className="px-5 py-3">Pemakaian</th>
                    <th className="px-5 py-3">Berakhir</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-[#0f172a]/15">
                  {vouchers.map((v) => (
                    <tr key={v.id} className="hover:bg-[#f3e8ff]/40">
                      <td className="px-5 py-3.5 font-mono text-xs font-extrabold text-[#0f172a]">
                        <span className="rounded-md border-2 border-[#0f172a] bg-[#67e8f9] px-2 py-0.5 shadow-[2px_2px_0px_#0f172a]">
                          {v.code}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-extrabold text-[#0f172a]">
                        {v.discount_type === "percentage"
                          ? `${v.discount_value}%${
                              v.max_discount_amount ? ` (maks ${formatIDR(v.max_discount_amount)})` : ""
                            }`
                          : formatIDR(v.discount_value)}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium text-[#334155]">
                        {formatIDR(v.min_order_amount)}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-bold text-[#334155]">
                        {v.used_count} / {v.max_uses ?? "∞"}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium text-[#475569]">
                        {v.expires_at ? formatDateID(v.expires_at) : "Selamanya"}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={v.is_active ? "success" : "neutral"}>
                          {v.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(v)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-[#fda4af] text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#f43f5e] hover:text-white cursor-pointer"
                          aria-label="Hapus voucher"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <CustomModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Buat Voucher Diskon Baru"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleCreate} isLoading={saving}>
              Simpan Voucher
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Kode Voucher"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="HEMAT20"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CustomSelect
              label="Tipe Diskon"
              value={discountType}
              onChange={(v) => setDiscountType(v as "percentage" | "fixed")}
              options={[
                { value: "percentage", label: "Persentase (%)" },
                { value: "fixed", label: "Nominal Tetap (IDR)" },
              ]}
            />
            <Input
              label={discountType === "percentage" ? "Nilai Diskon (%)" : "Nilai Diskon (IDR)"}
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {discountType === "percentage" && (
              <Input
                label="Maksimal Potongan (IDR)"
                type="number"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value)}
              />
            )}
            <Input
              label="Minimal Belanja (IDR)"
              type="number"
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Kuota Maksimal (Kosongkan = Unlimited)"
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            />
            <CustomDatePicker
              label="Tanggal Kadaluarsa (Opsional)"
              value={expiresAt}
              onChange={setExpiresAt}
            />
          </div>
          <CustomSwitch
            checked={isActive}
            onChange={setIsActive}
            label="Aktifkan Voucher Segera"
          />
        </div>
      </CustomModal>

      <CustomConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Voucher?"
        description={`Voucher "${deleteTarget?.code ?? ""}" akan dihapus permanen.`}
        confirmLabel="Ya, Hapus"
      />
    </div>
  );
}
