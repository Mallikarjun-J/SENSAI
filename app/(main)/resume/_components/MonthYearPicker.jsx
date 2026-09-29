"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Parse value string into structured parts */
function parseValue(str) {
  if (!str?.trim()) return { month: null, year: null, isPresent: false, yearOnly: false };
  const lower = str.trim().toLowerCase();
  if (["present", "current", "ongoing"].includes(lower)) {
    return { month: null, year: null, isPresent: true, yearOnly: false };
  }
  // Year-only: "2024"
  const yearMatch = str.trim().match(/^(\d{4})$/);
  if (yearMatch) {
    return { month: null, year: parseInt(yearMatch[1], 10), isPresent: false, yearOnly: true };
  }
  // Full "Jan 2024"
  const full = str.trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!full) return { month: null, year: null, isPresent: false, yearOnly: false };
  const normalized = MONTHS.find((m) => m.toLowerCase() === full[1].toLowerCase().slice(0, 3));
  return { month: normalized ?? null, year: parseInt(full[2], 10), isPresent: false, yearOnly: false };
}

function getDisplayText(parsed) {
  if (parsed.isPresent) return "Present";
  if (parsed.yearOnly) return String(parsed.year);
  if (parsed.month && parsed.year) return `${parsed.month} ${parsed.year}`;
  return null;
}

/**
 * MonthYearPicker
 *
 * Props:
 *   value        – "Jan 2022" | "2024" | "Present" | ""
 *   onChange     – (str: string) => void
 *   allowFuture  – year list extends +8 years (education expected graduation)
 *   allowPresent – shows "Present / Ongoing" quick-select button (education)
 *   allowYearOnly– shows "Year only: YYYY" quick-select button (education)
 *   disabled     – greys out (experience endDate when isCurrent)
 */
export function MonthYearPicker({
  value = "",
  onChange,
  allowFuture  = false,
  allowPresent = false,
  allowYearOnly = false,
  disabled = false,
}) {
  const parsed = parseValue(value);
  const currentYear = new Date().getFullYear();
  const maxYear = allowFuture ? currentYear + 8 : currentYear;
  const years = Array.from({ length: maxYear - 1959 }, (_, i) => maxYear - i);

  const [open, setOpen]           = useState(false);
  const [pickerYear, setPickerYear] = useState(parsed.year ?? currentYear);
  const [mode, setMode]           = useState("month"); // "month" | "year"

  const handleOpenChange = (isOpen) => {
    if (isOpen) {
      const { year } = parseValue(value);
      setPickerYear(year ?? currentYear);
      setMode("month");
    }
    setOpen(isOpen);
  };

  const handleMonthClick = (m) => {
    onChange(`${m} ${pickerYear}`);
    setOpen(false);
  };

  const handleYearSelect = (y) => {
    setPickerYear(y);
    setMode("month"); // back to month selection after picking year
  };

  const handleYearOnly = () => {
    onChange(String(pickerYear));
    setOpen(false);
  };

  const handlePresent = () => {
    onChange("Present");
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
  };

  const displayText = getDisplayText(parsed);
  const now = new Date();

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      {/* ── Trigger ── */}
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2",
            "text-sm min-w-[152px] transition-all focus:outline-none focus:ring-2 focus:ring-primary/50",
            "hover:bg-white/10",
            disabled && "opacity-40 cursor-not-allowed pointer-events-none"
          )}
        >
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className={cn("flex-1 text-left", displayText ? "text-foreground" : "text-muted-foreground/50")}>
            {displayText ?? "Select date"}
          </span>
          {displayText && !disabled && (
            <X
              className="h-3 w-3 text-muted-foreground hover:text-red-400 shrink-0 transition-colors"
              onClick={handleClear}
            />
          )}
        </button>
      </PopoverTrigger>

      {/* ── Popover panel ── */}
      <PopoverContent
        align="start"
        className={cn(
          "p-3 bg-zinc-900 border-white/15 shadow-2xl shadow-black/60",
          mode === "year" ? "w-[232px]" : "w-[216px]"
        )}
      >
        {/* ════ MONTH VIEW ════ */}
        {mode === "month" && (
          <div className="space-y-2">
            {/* Present / Ongoing quick-select */}
            {allowPresent && (
              <button
                type="button"
                onClick={handlePresent}
                className={cn(
                  "w-full rounded-md px-3 py-1.5 text-xs font-medium text-left transition-all",
                  parsed.isPresent
                    ? "bg-primary text-primary-foreground"
                    : "border border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                )}
              >
                Present / Ongoing
              </button>
            )}

            {/* Year row — click year number to open year grid */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPickerYear((y) => Math.max(1960, y - 1))}
                disabled={pickerYear <= 1960}
                className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground disabled:opacity-25 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* ← clicking this opens the year grid */}
              <button
                type="button"
                onClick={() => setMode("year")}
                className="text-sm font-semibold tabular-nums px-2 py-0.5 rounded hover:bg-white/10 hover:text-primary transition-all"
                title="Click to pick year from list"
              >
                {pickerYear} ▾
              </button>

              <button
                type="button"
                onClick={() => setPickerYear((y) => Math.min(maxYear, y + 1))}
                disabled={pickerYear >= maxYear}
                className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground disabled:opacity-25 transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Month grid */}
            <div className="grid grid-cols-3 gap-1">
              {MONTHS.map((m, idx) => {
                const isSelected = m === parsed.month && pickerYear === parsed.year;
                const isFuture =
                  !allowFuture &&
                  (pickerYear > now.getFullYear() ||
                    (pickerYear === now.getFullYear() && idx > now.getMonth()));
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={isFuture}
                    onClick={() => handleMonthClick(m)}
                    className={cn(
                      "rounded-md px-2 py-1.5 text-xs font-medium transition-all",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : isFuture
                        ? "text-muted-foreground/20 cursor-not-allowed"
                        : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
                    )}
                  >
                    {m}
                  </button>
                );
              })}
            </div>

            {/* Year-only quick-select */}
            {allowYearOnly && (
              <button
                type="button"
                onClick={handleYearOnly}
                className={cn(
                  "w-full rounded-md px-3 py-1.5 text-xs font-medium text-left transition-all border border-white/10",
                  parsed.yearOnly && parsed.year === pickerYear
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
                )}
              >
                Year only: {pickerYear}
              </button>
            )}
          </div>
        )}

        {/* ════ YEAR GRID VIEW ════ */}
        {mode === "year" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Select Year</span>
              <button
                type="button"
                onClick={() => setMode("month")}
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                ← Back
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1 max-h-[200px] overflow-y-auto">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => handleYearSelect(y)}
                  className={cn(
                    "rounded-md px-1 py-1.5 text-xs font-medium tabular-nums transition-all",
                    y === pickerYear
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  )}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
