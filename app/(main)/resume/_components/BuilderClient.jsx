"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
  Save,
  LayoutTemplate,
  Palette,
  Loader2,
} from "lucide-react";
import { updateResume } from "@/actions/resume";
import { downloadMarkdown } from "@/lib/generateMarkdown";
import { PersonalInfoForm } from "./PersonalInfoForm";
import { ProfessionalSummaryForm } from "./ProfessionalSummaryForm";
import { ExperienceForm } from "./ExperienceForm";
import { EducationForm } from "./EducationForm";
import { ProjectForm } from "./ProjectForm";
import { SkillsForm } from "./SkillsForm";
import { SectionOrderForm, DEFAULT_SECTION_ORDER } from "./SectionOrderForm";
import { CustomSectionForm } from "./CustomSectionForm";
import { ResumePreview } from "./ResumePreview";
import { TemplateSelector } from "./TemplateSelector";
import { ColorPicker } from "./ColorPicker";

const STEPS = [
  "Personal Info",
  "Professional Summary",
  "Experience",
  "Education",
  "Projects",
  "Skills",
  "Custom Sections",
  "Section Order",
];

const MIN_WIDTH = 320;
const DEFAULT_LEFT_PCT = 44;

function printResume() {
  const root = document.getElementById("resume-print-root");
  if (!root) return;

  const contentEl = root.querySelector("[data-content]");
  const computedFontSize = contentEl
    ? window.getComputedStyle(contentEl).fontSize
    : "10.5pt";

  const styleNodes = Array.from(
    document.querySelectorAll('style, link[rel="stylesheet"]')
  )
    .map((el) => el.outerHTML)
    .join("\n");

  const win = window.open("", "_blank", "width=900,height=1200");
  if (!win) return;

  const clone = root.cloneNode(true);
  clone.style.transform = "none";
  clone.style.transformOrigin = "unset";
  clone.style.boxShadow = "none";
  clone.style.overflow = "hidden";
  clone.style.width = "210mm";
  clone.style.height = "297mm";

  const cloneContent = clone.querySelector("[data-content]");
  if (cloneContent) {
    cloneContent.style.fontSize = computedFontSize;
    cloneContent.style.width = "100%";
    cloneContent.style.boxSizing = "border-box";
  }

  win.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      ${styleNodes}
      <style>
        @page { size: A4; margin: 0; }
        html, body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        #resume-print-root { width: 210mm; height: 297mm; overflow: hidden; box-shadow: none !important; box-sizing: border-box; }
        [data-content] { width: 100% !important; box-sizing: border-box !important; }
      </style>
    </head>
    <body>${clone.outerHTML}</body>
    </html>
  `);
  win.document.close();
  win.onload = () => {
    setTimeout(() => {
      win.focus();
      win.print();
      win.close();
    }, 400);
  };
}

export function BuilderClient({ resumeId, initial }) {
  const [data, setData] = useState(initial);
  const [step, setStep] = useState(0);
  const [leftPct, setLeftPct] = useState(DEFAULT_LEFT_PCT);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showColors, setShowColors] = useState(false);

  const containerRef = useRef(null);
  const isDragging = useRef(false);
  const templateRef = useRef(null);
  const colorRef = useRef(null);
  const backLinkRef = useRef(null);
  const [formLeft, setFormLeft] = useState('1rem');

  // Sync form left edge with the ← Back link's rendered position
  useEffect(() => {
    const measure = () => {
      if (!backLinkRef.current) return;
      const rect = backLinkRef.current.getBoundingClientRect();
      setFormLeft(rect.left + 'px');
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, []);

  const update = (key, value) => setData((d) => ({ ...d, [key]: value }));

  const onMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const totalW = rect.width;
    const newLeft = e.clientX - rect.left;
    const minPct = (MIN_WIDTH / totalW) * 100;
    const maxPct = 100 - minPct;
    const pct = Math.min(maxPct, Math.max(minPct, (newLeft / totalW) * 100));
    setLeftPct(pct);
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  useEffect(() => {
    const handler = (e) => {
      if (templateRef.current && !templateRef.current.contains(e.target))
        setShowTemplates(false);
      if (colorRef.current && !colorRef.current.contains(e.target))
        setShowColors(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const saveMut = useMutation({
    mutationFn: () =>
      updateResume({
        resumeId,
        data: {
          template: data.template,
          ascentColor: data.ascentColor,
          professionalSummary: data.professionalSummary,
          skills: data.skills ?? [],
          personalInfo: data.personalInfo ?? {},
          experience: data.experience ?? [],
          projects: data.projects ?? [],
          education: data.education ?? [],
          sectionOrder: data.sectionOrder ?? DEFAULT_SECTION_ORDER,
          customSections: data.customSections ?? [],
        },
      }),
    onSuccess: () => toast.success("Saved!"),
    onError: () => toast.error("Save failed"),
  });

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div
      className="flex flex-col overflow-hidden bg-background pt-16"
      style={{ position: 'fixed', inset: 0, zIndex: 10 }}
    >
      {/* ── ROW 1: Full-width top bar — Back (left) | .md PDF Save (right) ── */}
      <div className="no-print shrink-0 border-b border-white/10">
        <div className="container mx-auto flex items-center justify-between px-4 py-2.5">
          <Link
            ref={backLinkRef}
            href="/resume"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadMarkdown(data)}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 transition-all"
            >
              <FileText className="h-3.5 w-3.5" />
              .md
            </button>
            <button
              type="button"
              onClick={printResume}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </button>
            <button
              type="button"
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-all"
            >
              {saveMut.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Resizable body ── */}
      <div ref={containerRef} className="flex min-h-0 flex-1 overflow-hidden">
        {/* LEFT PANEL */}
        <div
          className="no-print flex flex-col overflow-hidden border-r border-white/10 bg-background"
          style={{ width: `${leftPct}%`, minWidth: MIN_WIDTH }}
        >
          {/* ROW 2: Form sub-toolbar — Template/Accent (left) | Previous/Next (right) */}
          <div
            className="flex items-center justify-between border-b border-white/10 py-2 shrink-0 pr-4"
            style={{ paddingLeft: formLeft }}
          >
            <div className="flex items-center gap-2">
              {/* Template picker */}
              <div className="relative" ref={templateRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplates((v) => !v);
                    setShowColors(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-sm hover:bg-white/10 transition-all"
                >
                  <LayoutTemplate className="h-4 w-4" />
                  Template
                </button>
                {showTemplates && (
                  <div className="absolute left-0 top-full mt-1 z-50 w-64 rounded-xl border border-white/15 bg-background/95 backdrop-blur p-3 shadow-xl shadow-black/40">
                    <TemplateSelector
                      value={data.template}
                      onChange={(v) => {
                        update("template", v);
                        setShowTemplates(false);
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Accent/Color picker */}
              <div className="relative" ref={colorRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowColors((v) => !v);
                    setShowTemplates(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-sm hover:bg-white/10 transition-all"
                >
                  <Palette className="h-4 w-4" />
                  Accent
                </button>
                {showColors && (
                  <div className="absolute left-0 top-full mt-1 z-50 w-64 rounded-xl border border-white/15 bg-background/95 backdrop-blur p-4 shadow-xl shadow-black/40">
                    <ColorPicker
                      value={data.ascentColor}
                      onChange={(v) => update("ascentColor", v)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Previous / Next */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                disabled={step === STEPS.length - 1}
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Progress bar — starts at the same formLeft offset as the form content */}
          <div
            className="h-0.5 shrink-0 bg-white/10"
            style={{ marginLeft: formLeft }}
          >
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Form area */}
          <div
            className="flex-1 overflow-y-auto py-5 pr-4"
            style={{ paddingLeft: formLeft }}
          >
            <h2 className="mb-4 text-lg font-semibold">{STEPS[step]}</h2>

            {step === 0 && (
              <PersonalInfoForm
                value={data.personalInfo ?? {}}
                onChange={(v) => update("personalInfo", v)}
              />
            )}
            {step === 1 && (
              <ProfessionalSummaryForm
                value={data.professionalSummary ?? ""}
                onChange={(v) => update("professionalSummary", v)}
              />
            )}
            {step === 2 && (
              <ExperienceForm
                value={data.experience ?? []}
                onChange={(v) => update("experience", v)}
              />
            )}
            {step === 3 && (
              <EducationForm
                value={data.education ?? []}
                onChange={(v) => update("education", v)}
              />
            )}
            {step === 4 && (
              <ProjectForm
                value={data.projects ?? []}
                onChange={(v) => update("projects", v)}
              />
            )}
            {step === 5 && (
              <SkillsForm
                value={data.skills ?? []}
                onChange={(v) => update("skills", v)}
              />
            )}
            {step === 6 && (
              <CustomSectionForm
                value={data.customSections ?? []}
                onChange={(v) => update("customSections", v)}
              />
            )}
            {step === 7 && (
              <SectionOrderForm
                value={data.sectionOrder ?? DEFAULT_SECTION_ORDER}
                onChange={(v) => update("sectionOrder", v)}
                customSections={data.customSections ?? []}
              />
            )}

            <div className="mt-6 flex justify-end gap-3">
              {step < STEPS.length - 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm hover:bg-white/10 transition-all"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60 transition-all shadow-md"
              >
                {saveMut.isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>

        {/* DRAG HANDLE */}
        <div
          onMouseDown={onMouseDown}
          className="group relative flex w-1.5 shrink-0 cursor-col-resize items-center justify-center bg-white/10 hover:bg-primary/50 transition-colors"
          title="Drag to resize"
        >
          <div className="h-8 w-0.5 rounded-full bg-white/30 group-hover:bg-primary/80 transition-colors" />
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 overflow-y-auto bg-muted/20 p-6">
          <ResumePreview data={data} />
        </div>
      </div>
    </div>
  );
}
