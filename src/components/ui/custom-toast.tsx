"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (item: Omit<ToastItem, "id">) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback((item: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2, 10);
    setItems((prev) => [...prev, { ...item, id }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismiss = (id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2 pointer-events-none">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-3.5 shadow-lg",
              item.type === "success" && "border-[#a7f3d0]",
              item.type === "error" && "border-[#fecaca]",
              item.type === "info" && "border-[#bfdbfe]"
            )}
          >
            {item.type === "success" && (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]" />
            )}
            {item.type === "error" && (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#dc2626]" />
            )}
            {item.type === "info" && (
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#2563eb]" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#0f172a]">{item.title}</p>
              {item.description && (
                <p className="mt-0.5 text-xs text-[#475569]">{item.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Tutup notifikasi"
              className="text-[#64748b] hover:text-[#0f172a] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
