"use client";
import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { enhanceProjectDescription } from "@/actions/resume";
import { toast } from "sonner";
import { projectArraySchema, formatZodErrors } from "@/lib/resume-schema";

const BASE_INPUT =
  "w-full rounded-md border bg-white/5 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all";

const inputCls = (hasErr) =>
  `${BASE_INPUT} ${hasErr ? "border-red-500/50 focus:ring-red-500/30" : "border-white/10 focus:ring-primary/50"}`;

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {msg}
    </p>
  );
}

function ProjectItem({ project, index, onChange, onRemove, errors, touched, onBlur }) {
  const [loading, setLoading] = useState(false);
  const err = (field) => (touched[`${index}.${field}`] ? errors[`${index}.${field}`] : null);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Project Name <span className="text-red-400">*</span>
          </label>
          <input
            value={project.name ?? ""}
            onChange={(e) => onChange({ name: e.target.value })}
            onBlur={() => onBlur(index, "name")}
            className={inputCls(!!err("name"))}
          />
          <FieldError msg={err("name")} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Type / Tech Stack</label>
          <input
            value={project.type ?? ""}
            placeholder="Next.js, Prisma, Gemini..."
            onChange={(e) => onChange({ type: e.target.value })}
            className={inputCls(false)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Description</label>
        <textarea
          rows={3}
          value={project.description ?? ""}
          placeholder="What did you build, what tools did you use, and what improved?"
          onChange={(e) => onChange({ description: e.target.value })}
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
        />
      </div>

      <div className="flex justify-between items-center">
        <button
          type="button"
          disabled={loading || !(project.description ?? "").trim()}
          onClick={async () => {
            setLoading(true);
            try {
              const { enhancedContent } = await enhanceProjectDescription({
                description: project.description ?? "",
                name: project.name,
                type: project.type,
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

export function ProjectForm({ value, onChange, validateTrigger = 0 }) {
  const [errors, setErrors]   = useState({});
  const [touched, setTouched] = useState({});

  const runValidation = (data) => {
    const result = projectArraySchema.safeParse(data);
    return result.success ? {} : formatZodErrors(result.error);
  };

  useEffect(() => {
    if (validateTrigger === 0) return;
    setErrors(runValidation(value));
    const allTouched = {};
    (value ?? []).forEach((_, i) => {
      allTouched[`${i}.name`] = true;
    });
    setTouched(allTouched);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validateTrigger]);

  const handleBlur = (index, field) => {
    setTouched((t) => ({ ...t, [`${index}.${field}`]: true }));
    setErrors(runValidation(value));
  };

  const set = (i, patch) => {
    const next = value.map((p, idx) => (idx === i ? { ...p, ...patch } : p));
    onChange(next);
    const hasTouched = Object.keys(touched).some((k) => k.startsWith(`${i}.`));
    if (hasTouched) setErrors(runValidation(next));
  };

  const remove = (i) => {
    onChange(value.filter((_, idx) => idx !== i));
    setErrors({});
    setTouched({});
  };

  const add = () => onChange([...value, {}]);

  return (
    <div className="space-y-4">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">No projects added yet. Add your side projects and portfolio pieces below.</p>
      )}
      {value.map((p, i) => (
        <ProjectItem
          key={i}
          project={p}
          index={i}
          errors={errors}
          touched={touched}
          onChange={(patch) => set(i, patch)}
          onRemove={() => remove(i)}
          onBlur={handleBlur}
        />
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 transition-all"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Project
      </button>
    </div>
  );
}
