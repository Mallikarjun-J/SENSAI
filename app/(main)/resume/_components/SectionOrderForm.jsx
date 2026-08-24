"use client";
import { useEffect } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

export const DEFAULT_SECTION_ORDER = [
  "summary",
  "experience",
  "education",
  "projects",
  "skills",
];

const SECTION_LABELS = {
  summary: "Professional Summary",
  experience: "Professional Experience",
  education: "Education",
  projects: "Projects",
  skills: "Skills",
};

export function SectionOrderForm({ value, onChange, customSections = [] }) {
  const baseOrder = value?.length > 0 ? value : DEFAULT_SECTION_ORDER;

  // Auto-add any new custom section IDs that aren't in the order yet
  const customIds = (customSections ?? []).map((cs) => cs.id);
  const missingIds = customIds.filter((id) => !baseOrder.includes(id));
  // Remove IDs of deleted custom sections from order
  const validCustomIds = new Set(customIds);
  const pruned = baseOrder.filter(
    (key) => SECTION_LABELS[key] !== undefined || validCustomIds.has(key)
  );
  const order = [...pruned, ...missingIds];

  // Sync back if order changed (missing added or stale removed)
  useEffect(() => {
    const changed =
      order.length !== (value?.length ?? 0) ||
      order.some((k, i) => k !== value?.[i]);
    if (changed) onChange(order);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customSections]);

  const move = (index, direction) => {
    const next = [...order];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const getLabelForKey = (key) => {
    if (SECTION_LABELS[key]) return SECTION_LABELS[key];
    const cs = (customSections ?? []).find((s) => s.id === key);
    return cs?.name?.trim() || "Unnamed Custom Section";
  };

  const isCustom = (key) => !SECTION_LABELS[key];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Use the arrows to change the order sections appear on your resume.
        The header (name &amp; contact) is always at the top.
      </p>

      <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 opacity-60">
        <span className="text-sm font-medium">📌 Personal Info &amp; Contact</span>
        <span className="ml-auto text-xs text-muted-foreground">Always first</span>
      </div>

      <div className="space-y-2">
        {order.map((key, i) => (
          <div
            key={key}
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 shadow-sm transition-shadow hover:shadow"
          >
            <span className="text-muted-foreground text-sm font-mono w-5 text-center select-none">
              {i + 1}
            </span>
            <span className="flex-1 text-sm font-medium flex items-center gap-2">
              {getLabelForKey(key)}
              {isCustom(key) && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Custom
                </span>
              )}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Move up"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={i === order.length - 1}
                onClick={() => move(i, 1)}
                className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Move down"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {order.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No sections to order yet.
        </p>
      )}
    </div>
  );
}
