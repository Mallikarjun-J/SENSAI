"use client";

const TEMPLATES = [
  { id: "classic", name: "Classic", hint: "Traditional clean layout", emoji: "📄" },
  { id: "modern", name: "Modern", hint: "Accent header, bordered entries", emoji: "🎨" },
  { id: "minimal", name: "Minimal", hint: "Quiet, whitespace-forward", emoji: "⬜" },
];

export function TemplateSelector({ value, onChange }) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-semibold mb-2">Templates</div>
      {TEMPLATES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`w-full rounded-lg border p-3 text-left transition-all ${
            value === t.id
              ? "border-primary bg-primary/10 shadow-sm shadow-primary/20"
              : "border-white/10 bg-white/5 hover:bg-white/10"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">{t.emoji}</span>
            <div>
              <div className="text-sm font-medium">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.hint}</div>
            </div>
            {value === t.id && (
              <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
