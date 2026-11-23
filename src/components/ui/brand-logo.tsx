import * as React from "react";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  xs: "h-7 w-7",
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-14 w-14",
  xl: "h-20 w-20 sm:h-24 sm:w-24",
} as const;

export function BrandLogo({
  size = "sm",
  className,
}: {
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="328 228 544 544"
      aria-hidden="true"
      className={cn("shrink-0 select-none", SIZE_CLASSES[size], className)}
    >
      <rect x="360" y="260" width="496" height="496" rx="112" fill="#0f172a" />
      <rect
        x="340"
        y="240"
        width="496"
        height="496"
        rx="112"
        fill="#ecfeff"
        stroke="#0f172a"
        strokeWidth="18"
      />
      <g transform="rotate(-8 588 488)">
        <path
          d="M 496 294 H 680 L 746 376 V 654 A 36 36 0 0 1 710 690 H 466 A 36 36 0 0 1 430 654 V 376 Z"
          fill="#0f172a"
          transform="translate(16, 16)"
        />
        <path
          d="M 496 294 H 680 L 746 376 V 654 A 36 36 0 0 1 710 690 H 466 A 36 36 0 0 1 430 654 V 376 Z"
          fill="#22d3ee"
          stroke="#0f172a"
          strokeWidth="18"
          strokeLinejoin="round"
        />
        <circle
          cx="588"
          cy="354"
          r="24"
          fill="#ffffff"
          stroke="#0f172a"
          strokeWidth="14"
        />
        <rect
          x="476"
          y="408"
          width="224"
          height="236"
          rx="28"
          fill="#a855f7"
          stroke="#0f172a"
          strokeWidth="15"
        />
        <path
          d="M 524 450 H 578 V 554 H 656 V 604 H 524 Z"
          fill="#ffffff"
          stroke="#0f172a"
          strokeWidth="13"
          strokeLinejoin="round"
        />
        <circle
          cx="634"
          cy="484"
          r="22"
          fill="#fde047"
          stroke="#0f172a"
          strokeWidth="12"
        />
      </g>
    </svg>
  );
}
