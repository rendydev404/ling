"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface CustomSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function CustomSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Pilih opsi...",
  searchable = false,
  disabled = false,
  error,
  className,
}: CustomSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = React.useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const lower = query.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lower) ||
        opt.description?.toLowerCase().includes(lower)
    );
  }, [options, query, searchable]);

  React.useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={containerRef} className={cn("relative w-full space-y-1.5", className)}>
      {label && (
        <span className="block text-xs font-semibold text-[#334155] tracking-wide">
          {label}
        </span>
      )}
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-xl border bg-white px-3.5 text-left text-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] disabled:bg-[#f8fafc] disabled:cursor-not-allowed",
          error ? "border-[#dc2626]" : open ? "border-[#059669]" : "border-[#cbd5e1]"
        )}
      >
        <span className={cn("truncate", selectedOption ? "text-[#0f172a]" : "text-[#94a3b8]")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[#64748b] transition-transform duration-150",
            open && "rotate-180 text-[#059669]"
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-1.5 w-full rounded-xl border border-[#e2e8f0] bg-white p-1.5 shadow-lg"
        >
          {searchable && (
            <div className="relative mb-1.5 px-1 pt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748b]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari pilihan..."
                className="h-8 w-full rounded-lg border border-[#e2e8f0] bg-[#f8fafc] pl-8 pr-2.5 text-xs text-[#0f172a] focus:outline-none focus:border-[#059669]"
              />
            </div>
          )}

          <div className="max-h-60 overflow-y-auto space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-[#64748b] text-center">
                Tidak ada opsi ditemukan
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors cursor-pointer",
                      isSelected
                        ? "bg-[#ecfdf5] text-[#047857] font-semibold"
                        : "text-[#0f172a] hover:bg-[#f8fafc]"
                    )}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate">{option.label}</div>
                      {option.description && (
                        <div className="truncate text-xs font-normal text-[#64748b]">
                          {option.description}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-[#059669]" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs font-medium text-[#dc2626]">{error}</p>}
    </div>
  );
}
