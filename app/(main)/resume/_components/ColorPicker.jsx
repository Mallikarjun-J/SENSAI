"use client";

const COLORS = [
  "#a78bfa", // purple (default - SensAI brand)
  "#8b5cf6",
  "#6366f1",
  "#2563eb",
  "#0ea5e9",
  "#0891b2",
  "#059669",
  "#16a34a",
  "#ca8a04",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#0f172a",
  "#64748b",
];

export function ColorPicker({ value, onChange }) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold">Accent Color</div>
      <div className="grid grid-cols-7 gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            title={c}
            className={`h-8 w-8 rounded-full transition-all ${
              value === c ? "ring-2 ring-offset-2 ring-offset-background ring-white scale-110" : "hover:scale-105"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-1">
        <label className="text-xs text-muted-foreground">Custom</label>
        <input
          type="color"
          value={value ?? "#a78bfa"}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-12 cursor-pointer rounded border border-white/10 bg-transparent p-0.5"
        />
        <span className="text-xs font-mono text-muted-foreground">{value}</span>
      </div>
    </div>
  );
}
