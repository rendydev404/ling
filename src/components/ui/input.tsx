"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, id, type = "text", ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const safeType = type === "search" || type === "date" ? "text" : type;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-extrabold uppercase tracking-wider text-[#0f172a]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#0f172a]">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={safeType}
            className={cn(
              "w-full h-10 rounded-xl border-2 border-[#0f172a] bg-white px-3.5 text-sm font-medium text-[#0f172a] placeholder:text-[#64748b] shadow-[2px_2px_0px_#0f172a] transition-all focus:outline-none focus:bg-[#ecfeff]/50 focus:shadow-[4px_4px_0px_#22d3ee] disabled:bg-[#f1f5f9] disabled:text-[#64748b]",
              leftIcon && "pl-9",
              error && "border-[#e11d48] bg-[#ffe4e6]/40 focus:shadow-[4px_4px_0px_#e11d48]",
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs font-bold text-[#e11d48]">{error}</p>}
        {!error && helperText && <p className="text-xs font-medium text-[#475569]">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id ?? generatedId;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-extrabold uppercase tracking-wider text-[#0f172a]"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "w-full min-h-[96px] rounded-xl border-2 border-[#0f172a] bg-white px-3.5 py-2.5 text-sm font-medium text-[#0f172a] placeholder:text-[#64748b] shadow-[2px_2px_0px_#0f172a] transition-all focus:outline-none focus:bg-[#ecfeff]/50 focus:shadow-[4px_4px_0px_#22d3ee] disabled:bg-[#f1f5f9] resize-y",
            error && "border-[#e11d48] bg-[#ffe4e6]/40 focus:shadow-[4px_4px_0px_#e11d48]",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs font-bold text-[#e11d48]">{error}</p>}
        {!error && helperText && <p className="text-xs font-medium text-[#475569]">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export interface CustomSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CustomSearchInput({
  value,
  onChange,
  placeholder = "Cari...",
  className,
}: CustomSearchInputProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0f172a]" />
      <input
        type="text"
        role="searchbox"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 rounded-xl border-2 border-[#0f172a] bg-white pl-10 pr-9 text-sm font-medium text-[#0f172a] placeholder:text-[#64748b] shadow-[3px_3px_0px_#0f172a] transition-all focus:outline-none focus:bg-[#ecfeff]/50 focus:shadow-[4px_4px_0px_#22d3ee]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Hapus pencarian"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md border border-[#0f172a] bg-[#f3e8ff] text-[#0f172a] hover:bg-[#a855f7] hover:text-white cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
