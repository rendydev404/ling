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
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-md border-2 border-[#0f172a] shadow-[2px_2px_0px_#0f172a] transition-colors cursor-pointer disabled:opacity-50",
          checked ? "bg-[#22d3ee]" : "bg-[#e2e8f0]"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 rounded-xs border-2 border-[#0f172a] bg-white transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
      {(label || description) && (
        <span className="space-y-0.5">
          {label && <span className="block text-sm font-extrabold text-[#0f172a]">{label}</span>}
          {description && <span className="block text-xs text-[#475569]">{description}</span>}
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
        "inline-flex flex-wrap items-center gap-1.5 rounded-xl border-2 border-[#0f172a] bg-white p-1.5 shadow-[3px_3px_0px_#0f172a]",
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
              "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-extrabold transition-all cursor-pointer",
              isActive
                ? "border-2 border-[#0f172a] bg-[#22d3ee] text-[#0f172a] shadow-[2px_2px_0px_#0f172a]"
                : "border-2 border-transparent text-[#334155] hover:bg-[#f3e8ff] hover:text-[#0f172a]"
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  "rounded-md border border-[#0f172a] px-1.5 py-0.5 text-[10px] font-extrabold",
                  isActive ? "bg-[#a855f7] text-white" : "bg-[#f1f5f9] text-[#0f172a]"
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
    neutral: "bg-[#f1f5f9] text-[#0f172a]",
    success: "bg-[#67e8f9] text-[#0f172a]",
    warning: "bg-[#fde047] text-[#0f172a]",
    danger: "bg-[#fda4af] text-[#0f172a]",
    info: "bg-[#d8b4fe] text-[#0f172a]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border-2 border-[#0f172a] px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide shadow-[2px_2px_0px_#0f172a] whitespace-nowrap",
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
        "rounded-2xl border-2 border-[#0f172a] bg-white shadow-[4px_4px_0px_#0f172a]",
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
    <div className="flex items-center justify-between border-t-2 border-[#0f172a] pt-4">
      <p className="text-xs font-medium text-[#475569]">
        Halaman <span className="font-extrabold text-[#0f172a]">{page}</span> dari{" "}
        <span className="font-extrabold text-[#0f172a]">{totalPages}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-8 items-center gap-1 rounded-lg border-2 border-[#0f172a] bg-white px-2.5 text-xs font-extrabold text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#ecfeff] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Sebelumnya
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-8 items-center gap-1 rounded-lg border-2 border-[#0f172a] bg-white px-2.5 text-xs font-extrabold text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#ecfeff] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
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
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#0f172a] bg-white px-6 py-12 text-center shadow-[4px_4px_0px_#0f172a]">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#0f172a] bg-[#f3e8ff] text-[#0f172a] shadow-[3px_3px_0px_#0f172a] mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-extrabold text-[#0f172a]">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#475569]">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
