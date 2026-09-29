"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Plus,
  X,
  Sparkles,
  Code2,
  Briefcase,
  BarChart3,
  FileQuestion,
  FileText,
  ChevronDown,
} from "lucide-react";
import {
  createVoiceInterview,
  generateVoiceInterviewQuestions,
  generateResumeJDInterviewQuestions,
} from "@/actions/interview";

const ROLE_SUGGESTIONS = [
  "Frontend Developer", "Backend Developer", "Full Stack Developer",
  "DevOps Engineer", "Data Engineer", "Machine Learning Engineer",
  "Mobile Developer", "QA Engineer", "Product Manager", "UI/UX Designer",
];

const TECH_SUGGESTIONS = [
  "React", "Next.js", "TypeScript", "JavaScript", "Node.js",
  "Python", "Java", "Go", "PostgreSQL", "MongoDB",
  "Docker", "AWS", "GraphQL", "Redis", "Tailwind CSS",
];

const LEVELS = ["Junior", "Mid", "Senior", "Lead"];
const TYPES = ["Technical", "Behavioral", "Mixed"];

export default function VoiceInterviewForm({
  userId,
  userName,
  defaultRole = "",
  defaultLevel = "Mid",
  defaultTechstack = [],
  resumes = [],
}) {
  const router = useRouter();

  // Mode: "standard" | "resumejd"
  const [mode, setMode] = useState("standard");

  // Standard mode state
  const [role, setRole] = useState(defaultRole);
  const [level, setLevel] = useState(defaultLevel);
  const [type, setType] = useState("Mixed");
  const [techInput, setTechInput] = useState("");
  const [techstack, setTechstack] = useState(defaultTechstack);
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false);
  const [showTechSuggestions, setShowTechSuggestions] = useState(false);

  // Resume + JD mode state
  const [resumeSource, setResumeSource] = useState(resumes.length > 0 ? "saved" : "paste");
  const [selectedResumeId, setSelectedResumeId] = useState(resumes[0]?.id || "");
  const [pastedResume, setPastedResume] = useState("");
  const [jdText, setJdText] = useState("");

  // Common state
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(false);

  const filteredRoles = ROLE_SUGGESTIONS.filter(
    (r) => r.toLowerCase().includes(role.toLowerCase()) && r.toLowerCase() !== role.toLowerCase()
  );

  const filteredTechs = TECH_SUGGESTIONS.filter(
    (t) =>
      t.toLowerCase().includes(techInput.toLowerCase()) &&
      !techstack.map((s) => s.toLowerCase()).includes(t.toLowerCase())
  );

  const addTech = (tech) => {
    const trimmed = tech.trim();
    if (!trimmed) return;
    if (techstack.map((t) => t.toLowerCase()).includes(trimmed.toLowerCase())) return;
    setTechstack((prev) => [...prev, trimmed]);
    setTechInput("");
    setShowTechSuggestions(false);
  };

  const removeTech = (tech) => setTechstack((prev) => prev.filter((t) => t !== tech));

  const handleTechKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTech(techInput);
    }
    if (e.key === "Backspace" && !techInput && techstack.length > 0) {
      setTechstack((prev) => prev.slice(0, -1));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (mode === "standard") {
      if (!role.trim()) {
        toast.error("Please enter a job role.");
        return;
      }
    } else {
      // Resume + JD validation
      if (resumeSource === "saved" && !selectedResumeId) {
        toast.error("Please select a saved resume or paste resume text.");
        return;
      }
      if (resumeSource === "paste" && !pastedResume.trim()) {
        toast.error("Please paste your resume content.");
        return;
      }
      if (!jdText.trim()) {
        toast.error("Please paste the job description.");
        return;
      }
      if (jdText.trim().length < 30) {
        toast.error("Please provide a more detailed job description.");
        return;
      }
    }

    setLoading(true);

    try {
      let questions;
      let finalRole = role.trim();
      let finalTechstack = techstack;
      let finalType = type;

      if (mode === "standard") {
        try {
          questions = await generateVoiceInterviewQuestions({
            role: role.trim(),
            level,
            type,
            techstack,
            amount: questionCount,
          });
        } catch (aiErr) {
          const msg = aiErr?.message ?? "";
          if (msg.includes("ENOTFOUND") || msg.includes("connect") || msg.includes("fetch")) {
            toast.error("Cannot reach the AI service. Check your internet connection.");
          } else {
            toast.error("AI question generation failed. Please try again.");
          }
          setLoading(false);
          return;
        }
      } else {
        // Resume + JD mode: default to Mixed
        finalType = "Mixed";
        try {
          const aiResult = await generateResumeJDInterviewQuestions({
            resumeId: resumeSource === "saved" ? selectedResumeId : undefined,
            resumeText: resumeSource === "paste" ? pastedResume.trim() : undefined,
            jdText: jdText.trim(),
            level,
            amount: questionCount,
          });

          questions = aiResult.questions;
          finalRole = aiResult.role || defaultRole || "Interview Candidate";
          finalTechstack = aiResult.techstack || [];
        } catch (aiErr) {
          console.error("AI question generation error:", aiErr);
          const msg = aiErr?.message ?? "";
          if (msg.includes("ENOTFOUND") || msg.includes("connect") || msg.includes("fetch")) {
            toast.error("Cannot reach the AI service. Check your internet connection.");
          } else {
            toast.error(aiErr?.message || "AI question generation failed. Please try again.");
          }
          setLoading(false);
          return;
        }
      }

      if (!questions || questions.length === 0) {
        toast.error("No questions were generated. Please try again.");
        setLoading(false);
        return;
      }

      const result = await createVoiceInterview({
        role: finalRole,
        level,
        type: finalType,
        techstack: finalTechstack,
        questions,
        finalized: true,
      });

      if (result.limitReached) {
        toast.error(`You've reached the ${result.limit}-interview limit. Delete an old interview to create a new one.`);
        setLoading(false);
        return;
      }

      if (!result.success || !result.interviewId) {
        toast.error("Failed to save interview. Please try again.");
        setLoading(false);
        return;
      }

      toast.success("Interview created! Starting your session…");
      router.push(`/interview/voice/${result.interviewId}`);
    } catch (err) {
      console.error(err);
      toast.error(err?.message ?? "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl">
        {/* Form container */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#1A1C20] to-[#08090D]">
          <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-7">

            {/* Mode Toggle */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Interview Setup Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1.5 rounded-2xl bg-white/5 border border-white/10">
                <button
                  type="button"
                  onClick={() => setMode("standard")}
                  className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    mode === "standard"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  Standard (Role & Tech)
                </button>
                <button
                  type="button"
                  onClick={() => setMode("resumejd")}
                  className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    mode === "resumejd"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  Resume + Job Description
                </button>
              </div>
            </div>

            {/* ── STANDARD MODE FIELDS ────────────────────────────── */}
            {mode === "standard" && (
              <>
                {/* Role */}
                <div className="relative flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-white">
                    <Briefcase className="h-4 w-4 text-primary" />
                    Job Role <span className="text-red-400">*</span>
                    {defaultRole && (
                      <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        pre-filled from your profile
                      </span>
                    )}
                  </label>
                  <input
                    id="voice-role"
                    type="text"
                    value={role}
                    onChange={(e) => { setRole(e.target.value); setShowRoleSuggestions(true); }}
                    onFocus={() => setShowRoleSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowRoleSuggestions(false), 150)}
                    placeholder="e.g. Frontend Developer"
                    className="rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 outline-none px-4 py-3 text-white text-sm placeholder:text-muted-foreground transition-colors w-full"
                    autoComplete="off"
                  />
                  {showRoleSuggestions && filteredRoles.length > 0 && role.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl border border-white/10 overflow-hidden bg-[#1A1C20] shadow-xl">
                      {filteredRoles.slice(0, 5).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onMouseDown={() => { setRole(r); setShowRoleSuggestions(false); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Level */}
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-white">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Experience Level
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {LEVELS.map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLevel(l)}
                        className={`px-5 py-2 rounded-full text-sm font-semibold transition-all border cursor-pointer ${
                          level === l
                            ? "bg-primary text-primary-foreground border-primary shadow-md"
                            : "bg-white/5 text-muted-foreground border-white/10 hover:border-primary/30 hover:text-white"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type */}
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-white">
                    <Code2 className="h-4 w-4 text-primary" />
                    Interview Type
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={`px-5 py-2 rounded-full text-sm font-semibold transition-all border cursor-pointer ${
                          type === t
                            ? "bg-primary text-primary-foreground border-primary shadow-md"
                            : "bg-white/5 text-muted-foreground border-white/10 hover:border-primary/30 hover:text-white"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tech Stack */}
                <div className="relative flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-white">
                    <Code2 className="h-4 w-4 text-primary" />
                    Tech Stack
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>

                  <div className="min-h-12 bg-white/5 rounded-xl px-4 py-2 flex flex-wrap gap-2 items-center border border-white/10 focus-within:border-primary/50 transition-colors">
                    {techstack.map((tech) => (
                      <span
                        key={tech}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium"
                      >
                        {tech}
                        <button type="button" onClick={() => removeTech(tech)} className="hover:text-red-400 transition-colors cursor-pointer">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      id="voice-techstack"
                      type="text"
                      value={techInput}
                      onChange={(e) => { setTechInput(e.target.value); setShowTechSuggestions(true); }}
                      onFocus={() => setShowTechSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowTechSuggestions(false), 150)}
                      onKeyDown={handleTechKeyDown}
                      placeholder={techstack.length === 0 ? "Type a tech and press Enter…" : "Add more…"}
                      className="flex-1 min-w-[140px] bg-transparent outline-none text-white text-sm placeholder:text-muted-foreground"
                    />
                  </div>

                  {showTechSuggestions && filteredTechs.length > 0 && techInput.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl border border-white/10 overflow-hidden bg-[#1A1C20] shadow-xl">
                      {filteredTechs.slice(0, 6).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onMouseDown={() => addTech(t)}
                          className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <Plus className="h-3 w-3 text-primary" />
                          {t}
                        </button>
                      ))}
                    </div>
                  )}

                  {techstack.length === 0 && techInput.length === 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {TECH_SUGGESTIONS.slice(0, 8).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => addTech(t)}
                          className="px-3 py-1 rounded-full bg-white/5 text-muted-foreground text-xs hover:text-white hover:bg-white/10 transition-colors border border-white/10 cursor-pointer"
                        >
                          + {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── RESUME + JD MODE FIELDS ─────────────────────────── */}
            {mode === "resumejd" && (
              <>
                {/* Resume Selection */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-medium text-white">
                      <FileText className="h-4 w-4 text-primary" />
                      Candidate Resume <span className="text-red-400">*</span>
                    </label>

                    {/* Resume Source Toggle */}
                    <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
                      <button
                        type="button"
                        onClick={() => setResumeSource("saved")}
                        className={`text-xs px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                          resumeSource === "saved"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-white"
                        }`}
                      >
                        Saved Resume
                      </button>
                      <button
                        type="button"
                        onClick={() => setResumeSource("paste")}
                        className={`text-xs px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                          resumeSource === "paste"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-white"
                        }`}
                      >
                        Paste Resume
                      </button>
                    </div>
                  </div>

                  {resumeSource === "saved" ? (
                    resumes && resumes.length > 0 ? (
                      <div className="relative">
                        <select
                          value={selectedResumeId}
                          onChange={(e) => setSelectedResumeId(e.target.value)}
                          className="w-full rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 outline-none px-4 py-3 text-white text-sm cursor-pointer transition-colors appearance-none pr-10"
                        >
                          {resumes.map((r) => (
                            <option key={r.id} value={r.id} className="bg-[#1A1C20] text-white">
                              {r.title}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground">
                          <ChevronDown className="h-4 w-4" />
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          No saved resumes found in your account.
                        </p>
                        <button
                          type="button"
                          onClick={() => setResumeSource("paste")}
                          className="mt-1 text-xs text-primary hover:underline font-medium cursor-pointer"
                        >
                          Switch to paste resume text →
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <textarea
                        rows={6}
                        value={pastedResume}
                        onChange={(e) => setPastedResume(e.target.value)}
                        placeholder="Paste your resume content here (summary, work experience, education, projects, skills)..."
                        className="w-full rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 outline-none p-4 text-white text-sm placeholder:text-muted-foreground transition-colors resize-y leading-relaxed"
                      />
                      <span className="text-[11px] text-muted-foreground self-end">
                        {pastedResume.trim().length} characters
                      </span>
                    </div>
                  )}
                </div>

                {/* Job Description */}
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-white">
                    <Briefcase className="h-4 w-4 text-primary" />
                    Job Description <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    rows={7}
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    placeholder="Paste the target job description here (role title, responsibilities, required technical skills, qualifications)..."
                    className="w-full rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 outline-none p-4 text-white text-sm placeholder:text-muted-foreground transition-colors resize-y leading-relaxed"
                  />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>AI will cross-examine your resume against this role&apos;s requirements</span>
                    <span>{jdText.trim().length} characters</span>
                  </div>
                </div>

                {/* Level */}
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-white">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Experience Level
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {LEVELS.map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLevel(l)}
                        className={`px-5 py-2 rounded-full text-sm font-semibold transition-all border cursor-pointer ${
                          level === l
                            ? "bg-primary text-primary-foreground border-primary shadow-md"
                            : "bg-white/5 text-muted-foreground border-white/10 hover:border-primary/30 hover:text-white"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── QUESTION COUNT (COMMON) ─────────────────────────── */}
            <div className="flex flex-col gap-3">
              <label className="flex items-center justify-between text-sm font-medium text-white">
                <span className="flex items-center gap-2">
                  <FileQuestion className="h-4 w-4 text-primary" />
                  Number of Questions
                </span>
                <span className="text-primary font-bold text-base">{questionCount}</span>
              </label>
              <input
                id="voice-question-count"
                type="range"
                min={3}
                max={15}
                step={1}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary"
                style={{
                  background: `linear-gradient(to right, hsl(var(--primary)) ${((questionCount - 3) / 12) * 100}%, rgba(255,255,255,0.1) ${((questionCount - 3) / 12) * 100}%)`,
                }}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>3</span>
                <span>9</span>
                <span>15</span>
              </div>
            </div>

            <div className="border-t border-white/10" />

            <Button
              id="voice-interview-submit"
              type="submit"
              disabled={loading}
              className="w-full min-h-12 font-bold text-base cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === "resumejd" ? "Analyzing Resume & JD…" : "Generating Questions…"}
                </>
              ) : (
                <>Generate & Start Interview</>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              {mode === "resumejd"
                ? `AI will cross-reference your resume with the JD to craft ${questionCount} targeted questions`
                : `AI will craft ${questionCount} tailored questions based on your preferences`}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}