"use client";

import * as React from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const DAY_HEADERS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function toIsoDate(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export interface CustomDatePickerProps {
  label?: string;
  value: string;
  onChange: (isoDate: string) => void;
  minDate?: string;
  allowedWeekdays?: number[];
  inline?: boolean;
}

export function CustomDatePicker({
  label,
  value,
  onChange,
  minDate,
  allowedWeekdays,
  inline = false,
}: CustomDatePickerProps) {
  const initial = value ? new Date(`${value}T00:00:00`) : new Date();
  const [viewYear, setViewYear] = React.useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(initial.getMonth());
  const [open, setOpen] = React.useState(inline);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (inline) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [inline]);

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const calendarCard = (
    <div className="rounded-xl border-2 border-[#0f172a] bg-white p-3.5 shadow-[4px_4px_0px_#0f172a]">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-white text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#ecfeff] cursor-pointer"
          aria-label="Bulan sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-extrabold text-[#0f172a]">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-white text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#ecfeff] cursor-pointer"
          aria-label="Bulan berikutnya"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-extrabold uppercase text-[#475569] mb-1.5">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
          <div key={`empty-${idx}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const iso = toIsoDate(viewYear, viewMonth, day);
          const weekday = new Date(viewYear, viewMonth, day).getDay();
          const isBeforeMin = Boolean(minDate && iso < minDate);
          const isDisallowedWeekday = Boolean(
            allowedWeekdays && allowedWeekdays.length > 0 && !allowedWeekdays.includes(weekday)
          );
          const isDisabled = isBeforeMin || isDisallowedWeekday;
          const isSelected = value === iso;

          return (
            <button
              key={iso}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                onChange(iso);
                if (!inline) setOpen(false);
              }}
              className={cn(
                "h-9 w-full rounded-lg border-2 text-xs font-bold transition-all",
                isSelected
                  ? "border-[#0f172a] bg-[#22d3ee] text-[#0f172a] font-extrabold shadow-[2px_2px_0px_#0f172a]"
                  : isDisabled
                  ? "border-transparent text-[#cbd5e1] cursor-not-allowed"
                  : "border-transparent text-[#0f172a] hover:border-[#0f172a] hover:bg-[#f3e8ff] cursor-pointer"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (inline) {
    return (
      <div className="space-y-1.5">
        {label && (
          <span className="block text-xs font-extrabold uppercase tracking-wider text-[#0f172a]">
            {label}
          </span>
        )}
        {calendarCard}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative w-full space-y-1.5">
      {label && (
        <span className="block text-xs font-extrabold uppercase tracking-wider text-[#0f172a]">
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-between rounded-xl border-2 border-[#0f172a] bg-white px-3.5 text-sm font-semibold text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#ecfeff] cursor-pointer"
      >
        <span className={value ? "text-[#0f172a]" : "text-[#64748b]"}>
          {value || "Pilih tanggal..."}
        </span>
        <CalendarIcon className="h-4 w-4 text-[#0f172a]" />
      </button>
      {open && <div className="absolute left-0 z-50 mt-2 w-72">{calendarCard}</div>}
    </div>
  );
}

export interface TimeSlotOption {
  start: string;
  end: string;
  available: boolean;
}

export function CustomTimeSlotPicker({
  slots,
  value,
  onChange,
  loading = false,
}: {
  slots: TimeSlotOption[];
  value: string;
  onChange: (start: string, end: string) => void;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="h-10 rounded-xl border-2 border-[#0f172a] bg-[#ecfeff] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-xl border-2 border-[#0f172a] bg-[#f4f8fb] p-4 text-center text-xs font-semibold text-[#475569]">
        Tidak ada slot tersedia untuk tanggal yang dipilih. Silakan pilih tanggal lain.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {slots.map((slot) => {
        const isSelected = value === slot.start;
        return (
          <button
            key={slot.start}
            type="button"
            disabled={!slot.available}
            onClick={() => onChange(slot.start, slot.end)}
            className={cn(
              "flex items-center justify-center gap-1.5 h-10 rounded-xl border-2 text-xs font-extrabold transition-all",
              isSelected
                ? "border-[#0f172a] bg-[#22d3ee] text-[#0f172a] shadow-[3px_3px_0px_#0f172a]"
                : !slot.available
                ? "border-[#cbd5e1] bg-[#f1f5f9] text-[#94a3b8] line-through cursor-not-allowed"
                : "border-[#0f172a] bg-white text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#f3e8ff] cursor-pointer"
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{slot.start}</span>
          </button>
        );
      })}
    </div>
  );
}
