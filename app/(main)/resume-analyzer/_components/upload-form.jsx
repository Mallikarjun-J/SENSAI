"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { useUploadThing } from "@/lib/uploadthing";
import {
  createResumeAnalysis,
  analyzeResumeAction,
  analyzeResumeFromBuilder,
} from "@/actions/resume-analysis";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Upload, FileText, Building2, Briefcase, AlignLeft,
  ArrowRight, ArrowLeft, CheckCircle2, Loader2, AlertCircle,
  LayoutTemplate, ChevronRight,
} from "lucide-react";
import Link from "next/link";

const STATUS_MESSAGES = [
  "Uploading your resume...",
  "Sending to Gemini AI...",
  "Analyzing ATS compatibility...",
  "Evaluating tone and style...",
  "Checking content quality...",
  "Assessing structure & skills...",
  "Generating your report...",
];

const BUILDER_STATUS_MESSAGES = [
  "Reading your resume...",
  "Sending to Gemini AI...",
  "Analyzing ATS compatibility...",
  "Evaluating tone and style...",
  "Checking content quality...",
  "Assessing structure & skills...",
  "Generating your report...",
];

const MAX_SIZE_MB = 4;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const TEMPLATE_COLORS = {
  classic: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  modern: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  minimal: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  photo: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  tech: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

function StepPills({ step }) {
  return (
    <div className="flex items-center gap-2 mb-7">
      {[1, 2].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold border transition-all duration-300 ${
            step > s
              ? "bg-white/10 border-white/20 text-white"
              : step === s
              ? "border-purple-500/40 bg-purple-500/10 text-purple-300"
              : "bg-white/[0.02] border-white/6 text-muted-foreground"
          }`}>
            {step > s
              ? <CheckCircle2 className="w-3 h-3" />
              : <span className="w-4 h-4 flex items-center justify-center">{s}</span>
            }
            {s === 1 ? "Job Details" : "Your Resume"}
          </div>
          {s < 2 && <div className={`w-5 h-px transition-all ${step > 1 ? "bg-white/20" : "bg-white/6"}`} />}
        </div>
      ))}
    </div>
  );
}

export default function UploadForm({ resumes = [] }) {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1 | 2 | 3
  const [source, setSource] = useState("pdf"); // "pdf" | "builder"
  const [form, setForm] = useState({ companyName: "", jobTitle: "", jobDescription: "" });

  // PDF mode state
  const [file, setFile] = useState(null);

  // Builder mode state
  const [selectedResumeId, setSelectedResumeId] = useState(resumes[0]?.id ?? "");

  // Processing state
  const [statusIndex, setStatusIndex] = useState(0);
  const [error, setError] = useState(null);

  const { startUpload, isUploading } = useUploadThing("resumeUploader");

  const onDrop = useCallback((accepted) => {
    const f = accepted[0];
    if (!f) return;
    if (f.size > MAX_SIZE_BYTES) {
      setError(`File is too large. Maximum size is ${MAX_SIZE_MB}MB.`);
      return;
    }
    setFile(f);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: MAX_SIZE_BYTES,
    onDropRejected: (r) => {
      const msg = r[0]?.errors[0]?.message ?? "File rejected";
      setError(msg.toLowerCase().includes("large") ? `Max file size is ${MAX_SIZE_MB}MB.` : msg);
    },
  });

  const startStatusCycle = (messages) => {
    let i = 0;
    return setInterval(() => {
      i = (i + 1) % messages.length;
      setStatusIndex(i);
    }, 2500);
  };

  // ── Submit: PDF mode ──────────────────────────────────────────────────────────
  const handleSubmitPdf = async () => {
    if (!file) return;
    setError(null);
    setStep(3);
    const interval = startStatusCycle(STATUS_MESSAGES);

    try {
      const uploaded = await startUpload([file]);
      if (!uploaded?.[0]) throw new Error("File upload failed. Please try again.");

      const { ufsUrl: url, key } = uploaded[0];
      const analysis = await createResumeAnalysis({ ...form, resumeUrl: url, resumeKey: key });
      await analyzeResumeAction(analysis.id);

      clearInterval(interval);
      router.push(`/resume-analyzer/${analysis.id}`);
    } catch (err) {
      clearInterval(interval);
      const msg = err?.message ?? "Something went wrong.";
      toast.error(msg);
      setError(msg);
      setStep(2);
    }
  };

  // ── Submit: Builder mode ──────────────────────────────────────────────────────
  const handleSubmitBuilder = async () => {
    if (!selectedResumeId) return;
    setError(null);
    setStep(3);
    const interval = startStatusCycle(BUILDER_STATUS_MESSAGES);

    try {
      const result = await analyzeResumeFromBuilder({
        resumeId: selectedResumeId,
        ...form,
      });

      clearInterval(interval);
      router.push(`/resume-analyzer/${result.id}`);
    } catch (err) {
      clearInterval(interval);
      const msg = err?.message ?? "Something went wrong.";
      toast.error(msg);
      setError(msg);
      setStep(2);
    }
  };

  const handleSubmit = () => {
    if (source === "builder") handleSubmitBuilder();
    else handleSubmitPdf();
  };

  // ── Derived ───────────────────────────────────────────────────────────────────
  const canSubmit =
    source === "pdf" ? !!file && !isUploading : !!selectedResumeId;

  const activeMessages = source === "builder" ? BUILDER_STATUS_MESSAGES : STATUS_MESSAGES;

  // ── Step 1: Job Details ───────────────────────────────────────────────────────
  if (step === 1) {
    const valid = form.companyName.trim() && form.jobTitle.trim();
    return (
      <div>
        <StepPills step={step} />
        <h2 className="text-xl font-bold text-white mb-1">Job Details</h2>
        <p className="text-sm text-muted-foreground mb-6">Tell us about the role you're applying for</p>

        <div className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="companyName" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Company Name <span className="text-red-400">*</span>
            </label>
            <input
              id="companyName"
              value={form.companyName}
              onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
              placeholder="e.g. Google, Microsoft, Startup Inc."
              className="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 outline-none text-white placeholder:text-muted-foreground h-11 rounded-xl px-4 text-sm transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="jobTitle" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Job Title <span className="text-red-400">*</span>
            </label>
            <input
              id="jobTitle"
              value={form.jobTitle}
              onChange={(e) => setForm((p) => ({ ...p, jobTitle: e.target.value }))}
              placeholder="e.g. Senior Frontend Engineer"
              className="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 outline-none text-white placeholder:text-muted-foreground h-11 rounded-xl px-4 text-sm transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="jobDescription" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5" /> Job Description
              <span className="font-normal normal-case tracking-normal text-muted-foreground/50">(recommended)</span>
            </label>
            <textarea
              id="jobDescription"
              value={form.jobDescription}
              onChange={(e) => setForm((p) => ({ ...p, jobDescription: e.target.value }))}
              placeholder="Paste the full job description for targeted, role-specific feedback..."
              rows={6}
              className="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 outline-none text-white placeholder:text-muted-foreground rounded-xl px-4 py-3 text-sm transition-colors resize-none"
            />
            <p className="text-right text-xs text-muted-foreground">{form.jobDescription.length} chars</p>
          </div>
        </div>

        <Button
          onClick={() => valid && setStep(2)}
          disabled={!valid}
          className="mt-6 w-full h-11 gap-2 font-semibold"
        >
          Next: Choose Resume <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // ── Step 2: Resume Source ─────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div>
        <StepPills step={step} />
        <h2 className="text-xl font-bold text-white mb-1">Your Resume</h2>
        <p className="text-sm text-muted-foreground mb-6">
          For{" "}
          <span className="text-white font-medium">{form.jobTitle}</span> at{" "}
          <span className="text-white font-medium">{form.companyName}</span>
        </p>

        {/* Source toggle */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 mb-6">
          <button
            type="button"
            onClick={() => setSource("pdf")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              source === "pdf"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload PDF
          </button>
          <button
            type="button"
            onClick={() => setSource("builder")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              source === "builder"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            }`}
          >
            <LayoutTemplate className="w-4 h-4" />
            Resume Builder
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* ── PDF mode ── */}
        {source === "pdf" && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 mb-6 ${
              isDragActive
                ? "border-purple-500/50 bg-purple-500/5"
                : file
                ? "border-white/25 bg-white/[0.02]"
                : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
            }`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-white" />
                </div>
                <p className="font-semibold text-white truncate max-w-[220px] mx-auto">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB — click or drag to replace
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto">
                  <Upload className={`w-7 h-7 transition-colors ${isDragActive ? "text-purple-400" : "text-muted-foreground"}`} />
                </div>
                <p className="font-semibold text-white/80">
                  {isDragActive ? "Drop it here!" : "Drag & drop your resume"}
                </p>
                <p className="text-xs text-muted-foreground">PDF only · max {MAX_SIZE_MB}MB</p>
              </div>
            )}
          </div>
        )}

        {/* ── Builder mode ── */}
        {source === "builder" && (
          <div className="mb-6">
            {resumes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                  <LayoutTemplate className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">No resumes in Resume Builder yet</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Build a resume first, then come back to analyze it.
                  </p>
                </div>
                <Link href="/resume" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
                  Go to Resume Builder <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-3">
                  Select a resume to analyze:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {resumes.map((r) => {
                    const isSelected = selectedResumeId === r.id;
                    const templateColor = TEMPLATE_COLORS[r.template] ?? TEMPLATE_COLORS.minimal;
                    const daysAgo = Math.floor(
                      (Date.now() - new Date(r.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    const timeLabel = daysAgo === 0 ? "today" : daysAgo === 1 ? "1d ago" : `${daysAgo}d ago`;

                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedResumeId(r.id)}
                        className={`relative text-left p-4 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary/60 bg-primary/10 shadow-sm shadow-primary/10"
                            : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/5"
                        }`}
                      >
                        {isSelected && (
                          <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-primary" />
                        )}
                        <p className="text-sm font-semibold text-white pr-6 truncate">{r.title}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${templateColor}`}>
                            {r.template ?? "default"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{timeLabel}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep(1)} className="gap-2 border-white/10">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 h-11 gap-2 font-semibold"
          >
            <FileText className="w-4 h-4" /> Analyze Resume
          </Button>
        </div>
      </div>
    );
  }

  // ── Step 3: Processing ────────────────────────────────────────────────────────
  return (
    <div className="text-center py-6 space-y-6">
      <div className="relative w-28 h-28 mx-auto">
        <div className="absolute inset-0 bg-purple-500/10 rounded-full animate-ping scale-150 opacity-30" />
        <div className="absolute inset-2 bg-purple-500/5 rounded-full animate-pulse" />
        <div className="relative w-28 h-28 bg-gradient-to-br from-purple-600 to-violet-700 rounded-full flex items-center justify-center shadow-2xl shadow-purple-500/20">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-2">Analyzing your resume</h2>
        <p className="text-sm text-muted-foreground min-h-[20px] transition-all duration-500">
          {activeMessages[statusIndex]}
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5">
        {activeMessages.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-500 ${
              i === statusIndex ? "w-8 bg-purple-400" : "w-1.5 bg-white/10"
            }`}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {source === "builder" ? "Usually takes 10–20 seconds" : "Usually takes 15–30 seconds"}
      </p>
    </div>
  );
}
