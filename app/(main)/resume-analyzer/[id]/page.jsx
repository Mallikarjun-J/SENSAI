import { redirect, notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, ExternalLink, AlertCircle,
  Clock, Plus, CheckCircle2, XCircle, TrendingUp,
} from "lucide-react";
import { getResumeAnalysis, deleteResumeAnalysis } from "@/actions/resume-analysis";
import ScoreCircle from "../_components/score-circle";
import FeedbackSection from "../_components/feedback-section";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const analysis = await getResumeAnalysis(id);
  return {
    title: analysis
      ? `${analysis.jobTitle} at ${analysis.companyName} — SensAI`
      : "Resume Analysis — SensAI",
  };
}

function getScoreLabel(s) { return s >= 70 ? "Strong" : s >= 40 ? "Average" : "Needs Work"; }
function getScoreBg(s) {
  return s >= 70
    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
    : s >= 40
    ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
    : "bg-red-500/10 border-red-500/20 text-red-400";
}

function ScoreBar({ label, score }) {
  const barColor  = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";
  const textColor = score >= 70 ? "#4ade80" : score >= 40 ? "#fbbf24" : "#f87171";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-bold tabular-nums" style={{ color: textColor }}>
          {score}<span className="text-muted-foreground font-normal">/100</span>
        </span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${score}%`, background: barColor }}
        />
      </div>
    </div>
  );
}

export default async function AnalysisPage({ params }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const analysis = await getResumeAnalysis(id);
  if (!analysis) notFound();

  const feedback = analysis.feedback;

  return (
    <div className="space-y-0 -mt-4">
      {/* Back bar */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/resume-analyzer">
          <Button variant="ghost" size="sm" className="gap-2 rounded-full">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="h-4 w-px bg-white/10" />
        <p className="text-sm text-muted-foreground truncate">
          {analysis.jobTitle} at {analysis.companyName}
        </p>
      </div>

      {/* ── ERROR ──────────────────────────────────────────────────────────────── */}
      {analysis.status === "ERROR" && (
        <div className="rounded-2xl border border-white/10 p-12 text-center space-y-5">
          <div className="size-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Analysis Failed</h2>
            <p className="text-muted-foreground mt-1 text-sm">Something went wrong. Please delete this and try again.</p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button asChild >
              <Link href="/resume-analyzer/new"><Plus className="h-4 w-4" />Try Again</Link>
            </Button>
          </div>
        </div>
      )}

      {/* ── PROCESSING ─────────────────────────────────────────────────────────── */}
      {(analysis.status === "PROCESSING" || analysis.status === "PENDING") && !feedback && (
        <div className="rounded-2xl border border-white/10 p-12 text-center space-y-5">
          <div className="relative size-24 mx-auto">
            <div className="absolute inset-0 bg-purple-500/10 rounded-full animate-ping opacity-30" />
            <div className="relative size-24 bg-gradient-to-br from-purple-600 to-violet-700 rounded-full flex items-center justify-center shadow-2xl shadow-purple-500/20">
              <Clock className="h-10 w-10 text-white animate-pulse" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Analyzing your resume…</h2>
            <p className="text-muted-foreground mt-1">This usually takes 15–30 seconds. Refresh to see results.</p>
          </div>
        </div>
      )}

      {/* ── DONE ───────────────────────────────────────────────────────────────── */}
      {feedback && (
        <div className="flex max-lg:flex-col gap-6">

          {/* LEFT SIDEBAR */}
          <aside className="lg:w-[320px] flex-shrink-0 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">
                {new Date(analysis.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
              <h2 className="text-lg font-bold text-white leading-tight">{analysis.jobTitle}</h2>
              <p className="text-sm text-muted-foreground">{analysis.companyName}</p>
            </div>

            {/* PDF preview */}
            <div className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.02] aspect-[3/4] relative">
              <iframe
                src={`${analysis.resumeUrl}#toolbar=0&navpanes=0`}
                className="absolute inset-0 w-full h-full border-0"
                title="Resume preview"
              />
            </div>

            <a href={analysis.resumeUrl} target="_blank" rel="noopener noreferrer" className="block">
              <Button variant="outline" className="w-full border-white/10 gap-2">
                <ExternalLink className="h-4 w-4" /> Open Full PDF
              </Button>
            </a>

            {/* Score breakdown */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Score Breakdown</p>
              <ScoreBar label="Overall"   score={feedback.overallScore} />
              <ScoreBar label="ATS"       score={feedback.ATS.score} />
              <ScoreBar label="Tone"      score={feedback.toneAndStyle.score} />
              <ScoreBar label="Content"   score={feedback.content.score} />
              <ScoreBar label="Structure" score={feedback.structure.score} />
              <ScoreBar label="Skills"    score={feedback.skills.score} />
            </div>
          </aside>

          {/* RIGHT MAIN */}
          <main className="flex-1 space-y-6 min-w-0">
            {/* Score hero */}
            <div className="flex items-center gap-6 rounded-2xl border border-white/10 bg-gradient-to-b from-[#1A1C20] to-[#08090D] p-6">
              <ScoreCircle score={feedback.overallScore} size="lg" />
              <div>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold mb-2 ${getScoreBg(feedback.overallScore)}`}>
                  <TrendingUp className="h-3 w-3" />
                  {getScoreLabel(feedback.overallScore)} Resume
                </div>
                <h1 className="text-2xl font-bold text-white leading-tight">
                  {analysis.jobTitle}{" "}
                  <span className="text-muted-foreground font-normal text-lg">at</span>{" "}
                  {analysis.companyName}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Analyzed {new Date(analysis.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* ATS Quick Tips */}
            {feedback.ATS.tips.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-foreground">ATS Quick Tips</p>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {feedback.ATS.tips.map((tip, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-3.5 rounded-xl text-base  border-l-2 bg-white/[0.02] border border-white/5 text-foreground ${
                        tip.type === "good" ? "border-l-emerald-500/50" : "border-l-amber-500/50"
                      }`}
                    >
                      {tip.type === "good"
                        ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                        : <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                      }
                      <span className={tip.type === "good" ? "text-white/70" : "text-white/50"} style={{ lineHeight: 1.5 }}>
                        {tip.tip}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Analysis */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-lg font-bold uppercase tracking-widest text-foreground">Detailed Analysis</p>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              <div className="space-y-3">
                <FeedbackSection title="Tone & Style" score={feedback.toneAndStyle.score} tips={feedback.toneAndStyle.tips} defaultOpen />
                <FeedbackSection title="Content"      score={feedback.content.score}      tips={feedback.content.tips} />
                <FeedbackSection title="Structure"    score={feedback.structure.score}    tips={feedback.structure.tips} />
                <FeedbackSection title="Skills"       score={feedback.skills.score}       tips={feedback.skills.tips} />
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
              <Button asChild variant="outline" className="w-full border-white/10 gap-2 rounded-full h-11">
                <Link href="/resume-analyzer/new">
                  <Plus className="h-4 w-4" /> Analyze Another Resume
                </Link>
              </Button>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
