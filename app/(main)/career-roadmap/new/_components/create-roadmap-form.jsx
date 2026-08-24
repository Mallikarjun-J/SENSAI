"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Map, ArrowRight, User, X } from "lucide-react";

const SUGGESTIONS = [
  "Full Stack Developer",
  "Machine Learning Engineer",
  "DevOps Engineer",
  "Data Scientist",
  "Mobile App Developer",
  "Cybersecurity Analyst",
  "Cloud Architect",
  "UI/UX Designer",
  "Product Manager",
  "Backend Developer",
];

export default function CreateRoadmapForm({ suggestedCareer = "", userSkills = [], userExperience = 0 }) {
  const router = useRouter();
  const [career, setCareer] = useState(suggestedCareer);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("idle");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!career.trim()) {
      toast.error("Please enter a career goal.");
      return;
    }

    setLoading(true);
    setStep("generating");

    try {
      const res = await fetch("/api/roadmap/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          career: career.trim(),
          skills: userSkills,
          experience: userExperience,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.roadmapId) {
        toast.error(data.error ?? "Generation failed. Please try again.");
        setLoading(false);
        setStep("idle");
        return;
      }

      setStep("saving");
      toast.success(`"${data.title}" roadmap created!`);
      router.push(`/career-roadmap/${data.roadmapId}`);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
      setStep("idle");
    }
  };

  const stepLabel = {
    idle: null,
    generating: "Generating your personalised roadmap…",
    saving: "Saving your roadmap…",
  }[step];

  const hasProfile = suggestedCareer || userSkills.length > 0 || userExperience > 0;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">

      {/* Profile context card — only shown if we have profile data */}
      {hasProfile && (
        <div
          className="rounded-2xl border p-5 space-y-3"
          style={{
            background: "rgba(167,139,250,0.06)",
            borderColor: "rgba(167,139,250,0.2)",
          }}
        >
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" style={{ color: "#a78bfa" }} />
            <p className="text-sm font-semibold" style={{ color: "#a78bfa" }}>
              Based on your profile
            </p>
          </div>

          <div className="grid gap-2 text-sm">
            {suggestedCareer && (
              <div className="flex items-center gap-2 text-white/70">
                <span className="text-white/30 text-xs w-20 flex-shrink-0">Career</span>
                <span className="font-medium text-white">{suggestedCareer}</span>
              </div>
            )}
            {userExperience > 0 && (
              <div className="flex items-center gap-2 text-white/70">
                <span className="text-white/30 text-xs w-20 flex-shrink-0">Experience</span>
                <span>{userExperience} year{userExperience === 1 ? "" : "s"}</span>
              </div>
            )}
            {userSkills.length > 0 && (
              <div className="flex items-start gap-2 text-white/70">
                <span className="text-white/30 text-xs w-20 flex-shrink-0 mt-0.5">Skills</span>
                <div className="flex flex-wrap gap-1.5">
                  {userSkills.slice(0, 8).map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        background: "rgba(167,139,250,0.15)",
                        color: "#c4b5fd",
                      }}
                    >
                      {s}
                    </span>
                  ))}
                  {userSkills.length > 8 && (
                    <span className="text-xs text-white/30">+{userSkills.length - 8} more</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-white/40">
            Gemini will use your skills and experience to skip basics and focus on what you need to learn.
          </p>
        </div>
      )}

      {/* Form card */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#1A1C20] to-[#08090D] p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Career input */}
          <div className="space-y-2">
            <label htmlFor="career-input" className="text-sm font-medium text-white">
              Target career role
              <span className="text-red-400 ml-1">*</span>
            </label>
            <div className="relative">
              <input
                id="career-input"
                type="text"
                value={career}
                onChange={(e) => setCareer(e.target.value)}
                placeholder="e.g. Full Stack Developer"
                disabled={loading}
                className="w-full rounded-xl bg-white/5 border border-white/10 focus:border-purple-500/50 outline-none px-4 py-3.5 pr-10 text-white text-sm placeholder:text-muted-foreground transition-colors disabled:opacity-50"
                autoComplete="off"
                autoFocus
              />
              {career && !loading && (
                <button
                  type="button"
                  onClick={() => setCareer("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {suggestedCareer && career !== suggestedCareer && (
              <button
                type="button"
                onClick={() => setCareer(suggestedCareer)}
                className="text-xs hover:underline transition-colors"
                style={{ color: "rgba(167,139,250,0.7)" }}
              >
                ← Use my profile career: {suggestedCareer}
              </button>
            )}
          </div>

          {/* Suggestions */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Or pick a popular career</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.filter((s) => s.toLowerCase() !== career.toLowerCase()).slice(0, 8).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={loading}
                  onClick={() => setCareer(s)}
                  className="px-3 py-1.5 rounded-full text-xs transition-all border cursor-pointer disabled:opacity-40 text-white/50 hover:text-white/80"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    borderColor: "rgba(255,255,255,0.1)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Loading status */}
          {loading && stepLabel && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                background: "rgba(167,139,250,0.08)",
                border: "1px solid rgba(167,139,250,0.2)",
              }}
            >
              <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" style={{ color: "#a78bfa" }} />
              <p className="text-sm" style={{ color: "#a78bfa" }}>{stepLabel}</p>
            </div>
          )}

          <Button
            id="generate-roadmap-submit"
            type="submit"
            disabled={loading}
            className="w-full min-h-12 font-bold text-base gap-2"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Building Roadmap…</>
            ) : (
              <><Sparkles className="h-4 w-4" />Generate My Roadmap <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Generation takes ~20-30 seconds · AI is personalising your roadmap
          </p>
        </form>
      </div>
    </div>
  );
}
