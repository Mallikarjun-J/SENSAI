"use client";
import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { educationArraySchema, formatZodErrors } from "@/lib/resume-schema";
import { MonthYearPicker } from "./MonthYearPicker";

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

export function EducationForm({ value, onChange, validateTrigger = 0 }) {
  const [errors, setErrors]   = useState({});
  const [touched, setTouched] = useState({});

  const runValidation = (data) => {
    const result = educationArraySchema.safeParse(data);
    return result.success ? {} : formatZodErrors(result.error);
  };

  useEffect(() => {
    if (validateTrigger === 0) return;
    setErrors(runValidation(value));
    const allTouched = {};
    (value ?? []).forEach((_, i) => {
      ["institution", "degree", "gpa"].forEach((f) => {
        allTouched[`${i}.${f}`] = true;
      });
    });
    setTouched(allTouched);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validateTrigger]);

  const handleBlur = (i, field) => {
    setTouched((t) => ({ ...t, [`${i}.${field}`]: true }));
    setErrors(runValidation(value));
  };

  const set = (i, key, val) => {
    const next = value.map((e, idx) => (idx === i ? { ...e, [key]: val } : e));
    onChange(next);
    if (touched[`${i}.${key}`]) setErrors(runValidation(next));
  };

  const remove = (i) => {
    onChange(value.filter((_, idx) => idx !== i));
    setErrors({});
    setTouched({});
  };

  const add = () => onChange([...value, {}]);

  const err = (i, field) => (touched[`${i}.${field}`] ? errors[`${i}.${field}`] : null);

  return (
    <div className="space-y-4">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">No education added yet. Add your degrees below.</p>
      )}
      {value.map((ed, i) => (
        <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Institution */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Institution <span className="text-red-400">*</span>
              </label>
              <input
                value={ed.institution ?? ""}
                onChange={(e) => set(i, "institution", e.target.value)}
                onBlur={() => handleBlur(i, "institution")}
                className={inputCls(!!err(i, "institution"))}
              />
              <FieldError msg={err(i, "institution")} />
            </div>

            {/* Degree */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Degree <span className="text-red-400">*</span>
              </label>
              <input
                value={ed.degree ?? ""}
                onChange={(e) => set(i, "degree", e.target.value)}
                onBlur={() => handleBlur(i, "degree")}
                className={inputCls(!!err(i, "degree"))}
              />
              <FieldError msg={err(i, "degree")} />
            </div>

            {/* Field of Study */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Field of Study</label>
              <input
                value={ed.field ?? ""}
                onChange={(e) => set(i, "field", e.target.value)}
                className={inputCls(false)}
              />
            </div>

            {/* Graduation Date — allows future, present, and year-only */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Graduation Date
                <span className="ml-1 text-xs text-muted-foreground">(expected OK)</span>
              </label>
              <MonthYearPicker
                value={ed.graduationDate ?? ""}
                onChange={(val) => set(i, "graduationDate", val)}
                allowFuture
                allowPresent
                allowYearOnly
              />
            </div>

            {/* GPA */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">GPA / Percentage</label>
              <input
                value={ed.gpa ?? ""}
                placeholder="8.5 or 85%"
                onChange={(e) => set(i, "gpa", e.target.value)}
                onBlur={() => handleBlur(i, "gpa")}
                className={inputCls(!!err(i, "gpa"))}
              />
              <FieldError msg={err(i, "gpa")} />
            </div>
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
