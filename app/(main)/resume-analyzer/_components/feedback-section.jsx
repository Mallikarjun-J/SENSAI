"use client";
import { CheckCircle2, AlertTriangle, ChevronDown } from "lucide-react";
import { useState } from "react";
import ScoreCircle from "./score-circle";

function scoreLabel(s) {
  return s >= 70 ? "Good" : s >= 40 ? "Fair" : "Needs Work";
}

function scoreColors(s) {
  if (s >= 70) return {
    bar: "#22c55e",
    badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    score: "text-emerald-400",
  };
  if (s >= 40) return {
    bar: "#f59e0b",
    badge: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    score: "text-amber-400",
  };
  return {
    bar: "#ef4444",
    badge: "bg-red-500/10 border-red-500/20 text-red-400",
    score: "text-red-400",
  };
}

export default function FeedbackSection({ title, score, tips, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const goodTips    = tips.filter((t) => t.type === "good");
  const improveTips = tips.filter((t) => t.type === "improve");
  const c = scoreColors(score);

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      {/* Header — clickable trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <ScoreCircle score={score} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <p className="font-bold text-lg text-white">{title}</p>
            <span className={`px-2 py-0.5 rounded-full text-sm font-bold border ${c.badge}`}>
              {scoreLabel(score)}
            </span>
          </div>
          {/* Score bar */}
          <div className="h-1 bg-white/5 rounded-full overflow-hidden w-full max-w-[180px]">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${score}%`, background: c.bar }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`text-xs font-bold tabular-nums ${c.score}`}>{score}/100</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Content */}
      {open && (
        <div className="px-5 pb-5 pt-1">
          <div className="h-px bg-white/5 mb-4" />
          <div className="grid sm:grid-cols-2 gap-3">
            {goodTips.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-widest text-foreground mb-2">
                  What's working
                </p>
                {goodTips.map((tip, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 p-3 rounded-lg border-l-2 border-l-emerald-500/50 border border-white/5 bg-white/[0.015] text-base"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white/80 font-medium text-base leading-snug">{tip.tip}</p>
                      {tip.explanation && (
                        <p className="text-base text-muted-foreground mt-1 leading-relaxed">{tip.explanation}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {improveTips.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-widest text-foreground mb-2">
                  To improve
                </p>
                {improveTips.map((tip, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 p-3 rounded-lg border-l-2 border-l-amber-500/50 border border-white/5 bg-white/[0.015] text-sm"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white/80 font-medium text-base leading-snug">{tip.tip}</p>
                      {tip.explanation && (
                        <p className="text-base text-muted-foreground mt-1 leading-relaxed">{tip.explanation}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
