"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Loader2, GripVertical, ArrowUp, ArrowDown, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { enhanceCustomEntry } from "@/actions/resume";
import { customSectionsSchema, formatZodErrors } from "@/lib/resume-schema";
import { MonthYearPicker } from "./MonthYearPicker";

const BASE_INPUT =
  "w-full rounded-xl border bg-white/5 px-3.5 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-all";

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

// ── Date range helpers ────────────────────────────────────────────────────────

const SEPARATOR = " – ";

/** "Jan 2022 – Aug 2022" → { from: "Jan 2022", to: "Aug 2022" } */
function parseDateRange(str) {
  if (!str?.trim()) return { from: "", to: "" };
  const idx = str.indexOf(SEPARATOR);
  if (idx !== -1) {
    return {
      from: str.slice(0, idx).trim(),
      to:   str.slice(idx + SEPARATOR.length).trim(),
    };
  }
  return { from: str.trim(), to: "" };
}

/** { from: "Jan 2022", to: "Aug 2022" } → "Jan 2022 – Aug 2022" */
function buildDateRange(from, to) {
  if (!from && !to) return "";
  if (!to) return from;
  if (!from) return to;
  return `${from}${SEPARATOR}${to}`;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const newEntry  = () => ({ id: crypto.randomUUID(), title: "", subtitle: "", date: "", description: "" });
const newSection = () => ({ id: crypto.randomUUID(), name: "", entries: [newEntry()] });

// ── Component ─────────────────────────────────────────────────────────────────

export function CustomSectionForm({ value = [], onChange, validateTrigger = 0 }) {
  const [enhancing, setEnhancing] = useState({});
  const [collapsed, setCollapsed] = useState({});
  const [errors, setErrors]       = useState({});
  const [touched, setTouched]     = useState({});

  const sections = Array.isArray(value) ? value : [];

  const runValidation = (data) => {
    const result = customSectionsSchema.safeParse(data);
    return result.success ? {} : formatZodErrors(result.error);
  };

  useEffect(() => {
    if (validateTrigger === 0) return;
    setErrors(runValidation(sections));
    const allTouched = {};
    sections.forEach((sec, si) => {
      allTouched[`${si}.name`] = true;
      (sec.entries ?? []).forEach((_, ei) => {
        allTouched[`${si}.entries.${ei}.title`] = true;
      });
    });
    setTouched(allTouched);
    setCollapsed({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validateTrigger]);

  const updateSections = (next) => {
    onChange(next);
    if (Object.keys(touched).length > 0) setErrors(runValidation(next));
  };

  const handleBlur = (key) => {
    setTouched((t) => ({ ...t, [key]: true }));
    setErrors(runValidation(sections));
  };

  const err = (key) => (touched[key] ? errors[key] : null);

  // ── Section helpers ──────────────────────────────────────────────────────────
  const addSection    = () => updateSections([...sections, newSection()]);
  const removeSection = (sid) => updateSections(sections.filter((s) => s.id !== sid));
  const moveUp        = (sid) => {
    const idx = sections.findIndex((s) => s.id === sid);
    if (idx <= 0) return;
    const next = [...sections];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    updateSections(next);
  };
  const moveDown = (sid) => {
    const idx = sections.findIndex((s) => s.id === sid);
    if (idx < 0 || idx >= sections.length - 1) return;
    const next = [...sections];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    updateSections(next);
  };
  const updateSection  = (sid, key, val) =>
    updateSections(sections.map((s) => (s.id === sid ? { ...s, [key]: val } : s)));
  const toggleCollapse = (sid) => setCollapsed((c) => ({ ...c, [sid]: !c[sid] }));

  // ── Entry helpers ────────────────────────────────────────────────────────────
  const addEntry = (sid) =>
    updateSections(sections.map((s) => s.id === sid ? { ...s, entries: [...s.entries, newEntry()] } : s));
  const removeEntry = (sid, eid) =>
    updateSections(sections.map((s) => s.id === sid ? { ...s, entries: s.entries.filter((e) => e.id !== eid) } : s));
  const updateEntry = (sid, eid, key, val) =>
    updateSections(sections.map((s) =>
      s.id === sid
        ? { ...s, entries: s.entries.map((e) => (e.id === eid ? { ...e, [key]: val } : e)) }
        : s
    ));

  /** Update the `date` string from from/to parts */
  const updateEntryDate = (sid, eid, from, to) =>
    updateEntry(sid, eid, "date", buildDateRange(from, to));

  const handleEnhance = async (sid, entry) => {
    if (!entry.description?.trim()) { toast.error("Write a description first before enhancing."); return; }
    setEnhancing((e) => ({ ...e, [entry.id]: true }));
    try {
      const { enhancedContent } = await enhanceCustomEntry({
        sectionName: sections.find((s) => s.id === sid)?.name ?? "Custom",
        title: entry.title, subtitle: entry.subtitle, description: entry.description,
      });
      updateEntry(sid, entry.id, "description", enhancedContent);
      toast.success("Enhanced with AI!");
    } catch {
      toast.error("AI enhancement failed.");
    } finally {
      setEnhancing((e) => ({ ...e, [entry.id]: false }));
    }
  };

  return (
    <div className="space-y-5">
      {sections.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/20 p-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">No custom sections yet.</p>
          <p className="text-xs text-muted-foreground/70 mb-4">
            Add sections like Certifications, Awards, Publications, Volunteering, etc.
          </p>
        </div>
      )}

      {sections.map((section, si) => (
        <div key={section.id} className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
          {/* Section header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.03]">
            <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            <div className="flex-1 min-w-0">
              <input
                value={section.name}
                onChange={(e) => updateSection(section.id, "name", e.target.value)}
                onBlur={() => handleBlur(`${si}.name`)}
                placeholder="Section name (e.g. Certifications)"
                className={`w-full bg-transparent text-sm font-semibold placeholder:text-muted-foreground/50 focus:outline-none ${err(`${si}.name`) ? "text-red-400" : ""}`}
              />
              {err(`${si}.name`) && (
                <p className="flex items-center gap-1 text-xs text-red-400 mt-0.5">
                  <AlertCircle className="h-3 w-3" /> {err(`${si}.name`)}
                </p>
              )}
            </div>
            <button type="button" onClick={() => moveUp(section.id)} disabled={si === 0}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed transition-all" title="Move up">
              <ArrowUp className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => moveDown(section.id)} disabled={si === sections.length - 1}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed transition-all" title="Move down">
              <ArrowDown className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => toggleCollapse(section.id)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all">
              {collapsed[section.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
            <button type="button" onClick={() => removeSection(section.id)}
              className="p-1 rounded-md text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-all">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Entries */}
          {!collapsed[section.id] && (
            <div className="p-4 space-y-4">
              {section.entries.map((entry, ei) => {
                const range     = parseDateRange(entry.date);
                const isPresent = range.to.toLowerCase() === "present";

                return (
                  <div key={entry.id} className="rounded-lg border border-white/10 p-4 space-y-3 bg-white/[0.02]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Entry {ei + 1}</span>
                      {section.entries.length > 1 && (
                        <button type="button" onClick={() => removeEntry(section.id, entry.id)}
                          className="p-1 rounded-md text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-all">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Title + Subtitle */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">
                          Title <span className="text-red-400">*</span>
                        </label>
                        <input
                          value={entry.title}
                          onChange={(e) => updateEntry(section.id, entry.id, "title", e.target.value)}
                          onBlur={() => handleBlur(`${si}.entries.${ei}.title`)}
                          placeholder="e.g. AWS Certified Developer"
                          className={inputCls(!!err(`${si}.entries.${ei}.title`))}
                        />
                        <FieldError msg={err(`${si}.entries.${ei}.title`)} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Subtitle / Issuer</label>
                        <input
                          value={entry.subtitle}
                          onChange={(e) => updateEntry(section.id, entry.id, "subtitle", e.target.value)}
                          placeholder="e.g. Amazon Web Services"
                          className={inputCls(false)}
                        />
                      </div>
                    </div>

                    {/* Date Range — From + To with Present toggle */}
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Date / Period</label>

                      <div className="flex flex-wrap items-center gap-3">
                        {/* FROM */}
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground/60">From</p>
                          <MonthYearPicker
                            value={range.from}
                            onChange={(val) => updateEntryDate(section.id, entry.id, val, isPresent ? "Present" : range.to)}
                            allowFuture
                          />
                        </div>

                        <span className="text-muted-foreground text-sm mt-4">–</span>

                        {/* TO */}
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground/60">To</p>
                          <MonthYearPicker
                            value={isPresent ? "" : range.to}
                            onChange={(val) => updateEntryDate(section.id, entry.id, range.from, val)}
                            allowFuture
                            disabled={isPresent}
                          />
                        </div>

                        {/* Present toggle */}
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer mt-4">
                          <input
                            type="checkbox"
                            checked={isPresent}
                            onChange={(e) => {
                              const to = e.target.checked ? "Present" : "";
                              updateEntryDate(section.id, entry.id, range.from, to);
                            }}
                            className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-primary"
                          />
                          Present
                        </label>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Description</label>
                      <textarea
                        value={entry.description}
                        onChange={(e) => updateEntry(section.id, entry.id, "description", e.target.value)}
                        rows={3}
                        placeholder="Describe this achievement or activity…"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <button type="button" disabled={enhancing[entry.id]}
                          onClick={() => handleEnhance(section.id, entry)}
                          className="inline-flex items-center gap-2 rounded-md bg-primary/10 border border-primary/30 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                          {enhancing[entry.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "✨"}
                          {enhancing[entry.id] ? "Enhancing…" : "Enhance with AI"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button type="button" onClick={() => addEntry(section.id)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/20 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-white/40 hover:bg-white/5 transition-all">
                <Plus className="h-3.5 w-3.5" /> Add Entry
              </button>
            </div>
          )}
        </div>
      ))}

      <button type="button" onClick={addSection}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 py-3 text-sm font-medium text-primary hover:bg-primary/5 hover:border-primary/50 transition-all">
        <Plus className="h-4 w-4" /> Add Custom Section
      </button>
    </div>
  );
}
