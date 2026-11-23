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
      <div className="fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2.5 pointer-events-none">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl border-2 border-[#0f172a] p-3.5 shadow-[4px_4px_0px_#0f172a]",
              item.type === "success" && "bg-[#cffafe]",
              item.type === "error" && "bg-[#ffe4e6]",
              item.type === "info" && "bg-[#f3e8ff]"
            )}
          >
            {item.type === "success" && (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0f172a]" />
            )}
            {item.type === "error" && (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#e11d48]" />
            )}
            {item.type === "info" && (
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#7e22ce]" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold text-[#0f172a]">{item.title}</p>
              {item.description && (
                <p className="mt-0.5 text-xs font-medium text-[#334155]">{item.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Tutup notifikasi"
              className="text-[#0f172a] hover:opacity-70 cursor-pointer"
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
