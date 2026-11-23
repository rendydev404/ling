"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function CustomSwitch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label className="inline-flex items-start gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer disabled:opacity-50",
          checked ? "border-[#059669] bg-[#059669]" : "border-[#cbd5e1] bg-[#e2e8f0]"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-5" : "translate-x-1"
          )}
        />
      </button>
      {(label || description) && (
        <span className="space-y-0.5">
          {label && <span className="block text-sm font-semibold text-[#0f172a]">{label}</span>}
          {description && <span className="block text-xs text-[#64748b]">{description}</span>}
        </span>
      )}
    </label>
  );
}

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export function CustomTabs({
  tabs,
  activeTab,
  onChange,
  className,
}: {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex flex-wrap items-center gap-1 rounded-xl border border-[#e2e8f0] bg-[#f1f5f9] p-1",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer",
              isActive
                ? "bg-white text-[#0f172a] shadow-xs"
                : "text-[#475569] hover:text-[#0f172a]"
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                  isActive ? "bg-[#ecfdf5] text-[#047857]" : "bg-[#e2e8f0] text-[#475569]"
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: "neutral" | "success" | "warning" | "danger" | "info";
  className?: string;
}) {
  const styles = {
    neutral: "bg-[#f1f5f9] text-[#334155] border-[#e2e8f0]",
    success: "bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]",
    warning: "bg-[#fffbeb] text-[#b45309] border-[#fde68a]",
    danger: "bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]",
    info: "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-[#e2e8f0] pt-4">
      <p className="text-xs text-[#64748b]">
        Halaman <span className="font-semibold text-[#0f172a]">{page}</span> dari{" "}
        <span className="font-semibold text-[#0f172a]">{totalPages}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#cbd5e1] bg-white px-2.5 text-xs font-semibold text-[#334155] hover:bg-[#f8fafc] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Sebelumnya
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#cbd5e1] bg-white px-2.5 text-xs font-semibold text-[#334155] hover:bg-[#f8fafc] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          Berikutnya
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#e2e8f0] bg-white text-[#475569] mb-3.5">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-[#0f172a]">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#64748b]">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
