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
        <span className="block text-xs font-extrabold uppercase tracking-wider text-[#0f172a]">
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
          "flex h-10 w-full items-center justify-between rounded-xl border-2 border-[#0f172a] bg-white px-3.5 text-left text-sm font-semibold shadow-[2px_2px_0px_#0f172a] transition-all cursor-pointer focus:outline-none focus:shadow-[4px_4px_0px_#22d3ee] disabled:bg-[#f1f5f9] disabled:cursor-not-allowed",
          open && "bg-[#ecfeff] shadow-[4px_4px_0px_#22d3ee]",
          error && "border-[#e11d48] shadow-[3px_3px_0px_#e11d48]"
        )}
      >
        <span className={cn("truncate", selectedOption ? "text-[#0f172a]" : "text-[#64748b]")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[#0f172a] transition-transform duration-150",
            open && "rotate-180 text-[#a855f7]"
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-2 w-full rounded-xl border-2 border-[#0f172a] bg-white p-1.5 shadow-[5px_5px_0px_#0f172a]"
        >
          {searchable && (
            <div className="relative mb-1.5 px-1 pt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#0f172a]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari pilihan..."
                className="h-8 w-full rounded-lg border-2 border-[#0f172a] bg-[#f4f8fb] pl-8 pr-2.5 text-xs font-medium text-[#0f172a] focus:outline-none focus:bg-white"
              />
            </div>
          )}

          <div className="max-h-60 overflow-y-auto space-y-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs font-semibold text-[#64748b] text-center">
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
                      "flex w-full items-center justify-between rounded-lg border-2 px-3 py-2 text-left text-sm transition-colors cursor-pointer",
                      isSelected
                        ? "border-[#0f172a] bg-[#22d3ee] text-[#0f172a] font-extrabold"
                        : "border-transparent text-[#0f172a] hover:border-[#0f172a] hover:bg-[#f3e8ff]"
                    )}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate">{option.label}</div>
                      {option.description && (
                        <div className="truncate text-xs font-medium text-[#334155]">
                          {option.description}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-[#0f172a]" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs font-bold text-[#e11d48]">{error}</p>}
    </div>
  );
}
