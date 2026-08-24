"use client";

function Item({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
      />
    </div>
  );
}

export function EducationForm({ value, onChange }) {
  const set = (i, key, val) =>
    onChange(value.map((e, idx) => (idx === i ? { ...e, [key]: val } : e)));
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));
  const add = () => onChange([...value, {}]);

  return (
    <div className="space-y-4">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">No education added yet. Add your degrees below.</p>
      )}
      {value.map((ed, i) => (
        <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Item label="Institution" value={ed.institution} onChange={(v) => set(i, "institution", v)} />
            <Item label="Degree" value={ed.degree} onChange={(v) => set(i, "degree", v)} />
            <Item label="Field of Study" value={ed.field} onChange={(v) => set(i, "field", v)} />
            <Item label="Graduation Date" value={ed.graduationDate} onChange={(v) => set(i, "graduationDate", v)} />
            <Item label="GPA / Percentage" value={ed.gpa} onChange={(v) => set(i, "gpa", v)} />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => remove(i)}
              className="rounded-md p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all"
              title="Remove"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 transition-all"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Education
      </button>
    </div>
  );
}
