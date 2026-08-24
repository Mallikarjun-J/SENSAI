"use client";
import { useState } from "react";
import { enhanceJobDescription } from "@/actions/resume";
import { toast } from "sonner";

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

function ExpItem({ exp, onChange, onRemove }) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Company">
          <input
            value={exp.company ?? ""}
            onChange={(e) => onChange({ company: e.target.value })}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </Field>
        <Field label="Job Title">
          <input
            value={exp.position ?? ""}
            onChange={(e) => onChange({ position: e.target.value })}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </Field>
        <Field label="Start Date">
          <input
            value={exp.startDate ?? ""}
            placeholder="Jan 2022"
            onChange={(e) => onChange({ startDate: e.target.value })}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </Field>
        <Field label="End Date">
          <input
            value={exp.endDate ?? ""}
            placeholder="Present"
            disabled={exp.isCurrent}
            onChange={(e) => onChange({ endDate: e.target.value })}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-40 transition-all"
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={!!exp.isCurrent}
          onChange={(e) => onChange({ isCurrent: e.target.checked, endDate: e.target.checked ? "" : exp.endDate })}
          className="h-4 w-4 rounded border-white/20 bg-white/5 accent-primary"
        />
        <span className="text-muted-foreground">Currently working here</span>
      </label>

      <Field label="Description">
        <textarea
          rows={4}
          value={exp.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
        />
      </Field>

      <div className="flex justify-between items-center">
        <button
          type="button"
          disabled={loading || !(exp.description ?? "").trim()}
          onClick={async () => {
            setLoading(true);
            try {
              const { enhancedContent } = await enhanceJobDescription({
                description: exp.description ?? "",
                position: exp.position,
                company: exp.company,
              });
              if (enhancedContent) onChange({ description: enhancedContent });
              toast.success("Description enhanced!");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "AI enhance failed");
            } finally {
              setLoading(false);
            }
          }}
          className="inline-flex items-center gap-2 rounded-md bg-primary/10 border border-primary/30 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : "✨"}
          {loading ? "Enhancing..." : "Enhance with AI"}
        </button>

        <button
          type="button"
          onClick={onRemove}
          className="rounded-md p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all"
          title="Remove"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function ExperienceForm({ value, onChange }) {
  const set = (i, patch) => onChange(value.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));
  const add = () => onChange([...value, { company: "", position: "", description: "" }]);

  return (
    <div className="space-y-4">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">No experience added yet. Add your work history below.</p>
      )}
      {value.map((exp, i) => (
        <ExpItem key={i} exp={exp} onChange={(patch) => set(i, patch)} onRemove={() => remove(i)} />
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 transition-all"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Experience
      </button>
    </div>
  );
}
