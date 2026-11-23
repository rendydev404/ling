"use client";

import * as React from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface CustomModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function CustomModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: CustomModalProps) {
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass: Record<NonNullable<CustomModalProps["size"]>, string> = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/60 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "w-full rounded-2xl border-2 border-[#0f172a] bg-white shadow-[6px_6px_0px_#0f172a] flex flex-col max-h-[90vh]",
          sizeClass[size]
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-[#0f172a] bg-[#ecfeff] px-6 py-4 rounded-t-2xl">
          <div>
            <h2 className="text-base font-extrabold text-[#0f172a]">{title}</h2>
            {description && <p className="mt-0.5 text-xs font-medium text-[#334155]">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-white text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#a855f7] hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2.5 border-t-2 border-[#0f172a] bg-[#f4f8fb] px-6 py-3.5 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export interface CustomConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  isLoading?: boolean;
}

export function CustomConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  variant = "danger",
  isLoading = false,
}: CustomConfirmDialogProps) {
  return (
    <CustomModal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3.5">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#0f172a] shadow-[2px_2px_0px_#0f172a]",
            variant === "danger" ? "bg-[#fda4af] text-[#0f172a]" : "bg-[#67e8f9] text-[#0f172a]"
          )}
        >
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium leading-relaxed text-[#334155]">{description}</p>
      </div>
    </CustomModal>
  );
}
