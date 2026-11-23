"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      primary:
        "bg-[#059669] text-white border border-[#059669] hover:bg-[#047857] hover:border-[#047857] active:bg-[#065f46]",
      secondary:
        "bg-[#0f172a] text-white border border-[#0f172a] hover:bg-[#1e293b] active:bg-[#020617]",
      outline:
        "bg-white text-[#0f172a] border border-[#cbd5e1] hover:bg-[#f8fafc] hover:border-[#94a3b8]",
      ghost:
        "bg-transparent text-[#334155] border border-transparent hover:bg-[#f1f5f9] hover:text-[#0f172a]",
      danger:
        "bg-[#dc2626] text-white border border-[#dc2626] hover:bg-[#b91c1c] hover:border-[#b91c1c]",
    };

    const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
      sm: "h-8 px-3 text-xs font-medium rounded-lg gap-1.5",
      md: "h-10 px-4 text-sm font-semibold rounded-xl gap-2",
      lg: "h-12 px-5 text-sm font-semibold rounded-xl gap-2",
      icon: "h-9 w-9 p-0 rounded-lg justify-center",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#059669] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
