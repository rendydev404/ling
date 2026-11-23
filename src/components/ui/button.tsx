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
        "bg-[#22d3ee] text-[#0f172a] border-2 border-[#0f172a] shadow-[3px_3px_0px_#0f172a] hover:bg-[#06b6d4] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
      secondary:
        "bg-[#a855f7] text-white border-2 border-[#0f172a] shadow-[3px_3px_0px_#0f172a] hover:bg-[#9333ea] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
      outline:
        "bg-white text-[#0f172a] border-2 border-[#0f172a] shadow-[3px_3px_0px_#0f172a] hover:bg-[#ecfeff] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
      ghost:
        "bg-transparent text-[#0f172a] border-2 border-transparent hover:border-[#0f172a] hover:bg-[#f3e8ff]",
      danger:
        "bg-[#fb7185] text-[#0f172a] border-2 border-[#0f172a] shadow-[3px_3px_0px_#0f172a] hover:bg-[#f43f5e] hover:text-white hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
    };

    const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
      sm: "h-8 px-3 text-xs font-extrabold rounded-lg gap-1.5",
      md: "h-10 px-4 text-sm font-extrabold rounded-xl gap-2",
      lg: "h-12 px-5 text-sm font-extrabold rounded-xl gap-2",
      icon: "h-9 w-9 p-0 rounded-lg justify-center",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a855f7] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
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
