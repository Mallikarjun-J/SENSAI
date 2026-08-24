"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, X, Sparkles, Code2, Briefcase, BarChart3, FileQuestion } from "lucide-react";
import { createVoiceInterview, generateVoiceInterviewQuestions } from "@/actions/interview";

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

export default function VoiceInterviewForm({ userId, userName, defaultRole = "", defaultLevel = "Mid", defaultTechstack = [] }) {
  const router = useRouter();

  const [role, setRole] = useState(defaultRole);
  const [level, setLevel] = useState(defaultLevel);
  const [type, setType] = useState("Mixed");
  const [techInput, setTechInput] = useState("");
  const [techstack, setTechstack] = useState(defaultTechstack);
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false);
  const [showTechSuggestions, setShowTechSuggestions] = useState(false);

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

    if (!role.trim()) {
      toast.error("Please enter a job role.");
      return;
    }

    setLoading(true);

    try {
      let questions;
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

      if (!questions || questions.length === 0) {
        toast.error("No questions were generated. Please try again.");
        setLoading(false);
        return;
      }

      const result = await createVoiceInterview({
        role: role.trim(),
        level,
        type,
        techstack,
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
        {/* Form */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#1A1C20] to-[#08090D]">
          <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-7">

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

            {/* Question Count */}
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
              className="w-full min-h-12 font-bold text-base"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating Questions…</>
              ) : (
                <>Generate & Start Interview</>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              AI will craft {questionCount} tailored questions based on your preferences
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}