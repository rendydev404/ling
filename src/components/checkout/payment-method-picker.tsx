"use client";

import { Check } from "lucide-react";
import {
  PAYMENT_GROUP_LABELS,
  PAYMENT_METHODS,
  type PaymentMethodCode,
  type PaymentMethodGroup,
} from "@/lib/payment-methods";

const GROUP_ORDER: PaymentMethodGroup[] = ["qris", "ewallet", "va"];

export function PaymentMethodChip({
  code,
  size = "md",
  className = "",
}: {
  code: PaymentMethodCode;
  size?: "sm" | "md";
  className?: string;
}) {
  const meta = PAYMENT_METHODS[code];
  const boxSize =
    size === "sm"
      ? "h-7 w-[64px] px-1.5 py-1 shadow-[1px_1px_0px_#0f172a]"
      : "h-9 w-[78px] px-2 py-1.5 shadow-[2px_2px_0px_#0f172a]";
  const imgSize = size === "sm" ? "max-h-4" : "max-h-5";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-white ${boxSize} ${className}`}
      title={meta.label}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={meta.logoSrc}
        alt={meta.label}
        loading="lazy"
        decoding="async"
        className={`${imgSize} w-full object-contain select-none`}
      />
    </span>
  );
}

export function PaymentMethodPicker({
  methods,
  value,
  onChange,
}: {
  methods: PaymentMethodCode[];
  value: PaymentMethodCode | null;
  onChange: (code: PaymentMethodCode) => void;
}) {
  if (methods.length === 0) {
    return (
      <p className="rounded-xl border-2 border-dashed border-[#0f172a] p-4 text-xs font-bold text-[#475569]">
        Belum ada metode pembayaran yang aktif. Hubungi kreator.
      </p>
    );
  }

  return (
    <div role="radiogroup" aria-label="Metode pembayaran" className="space-y-4">
      {GROUP_ORDER.map((group) => {
        const groupMethods = methods.filter((m) => PAYMENT_METHODS[m].group === group);
        if (groupMethods.length === 0) return null;
        return (
          <div key={group} className="space-y-2">
            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[#475569]">
              {PAYMENT_GROUP_LABELS[group]}
            </span>
            <div className="grid grid-cols-1 gap-2">
              {groupMethods.map((code) => {
                const meta = PAYMENT_METHODS[code];
                const active = value === code;
                return (
                  <button
                    key={code}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChange(code)}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 border-[#0f172a] px-3 py-2.5 text-left transition-all cursor-pointer ${
                      active
                        ? "bg-[#ecfeff] shadow-[3px_3px_0px_#0f172a] -translate-x-px -translate-y-px"
                        : "bg-white shadow-[2px_2px_0px_#0f172a] hover:bg-[#f8fafc]"
                    }`}
                  >
                    <PaymentMethodChip code={code} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-extrabold leading-tight text-[#0f172a]">
                        {meta.label}
                      </span>
                      <span className="block truncate text-[11px] font-medium text-[#475569]">
                        {meta.description}
                      </span>
                    </span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[#0f172a] ${
                        active ? "bg-[#22d3ee]" : "bg-white"
                      }`}
                    >
                      {active && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
