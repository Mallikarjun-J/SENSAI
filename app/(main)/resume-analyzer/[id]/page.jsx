import { redirect, notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft, ExternalLink, AlertCircle,
  Clock, Plus, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { getResumeAnalysis } from "@/actions/resume-analysis";
import ResumeBreakdown from "../_components/resume-breakdown";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const analysis = await getResumeAnalysis(id);
  return {
    title: analysis
      ? `${analysis.jobTitle} at ${analysis.companyName} — SensAI`
      : "Resume Analysis — SensAI",
  };
}

/* ─── Score helpers ──────────────────────────────────────────────────────── */
function getBadgeClass(score) {
  if (score >= 80) return "bg-green-500/20 text-green-400 border-green-500/30";
  if (score >= 60) return "bg-lime-500/20 text-lime-400 border-lime-500/30";
  if (score >= 40) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-red-500/20 text-red-400 border-red-500/30";
}

function getBadgeLabel(score) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Average";
  return "Needs Work";
}

/* ─── Score bar (sidebar) ────────────────────────────────────────────────── */
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

/* ─── Half-circle speedometer gauge ──────────────────────────────────────── */
function OverallGauge({ score }) {
  const cx = 150, cy = 148, r = 108;
  const T = Math.PI * r;

  const zones = [
    { color: "#ef4444", from: 0,     to: 0.395 },
    { color: "#f97316", from: 0.395, to: 0.595 },
    { color: "#a3e635", from: 0.595, to: 0.795 },
    { color: "#22c55e", from: 0.795, to: 1.0   },
  ];

  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const θ = ((180 - score * 1.8) * Math.PI) / 180;
  const nLen = 76;
  const nx = (cx + nLen * Math.cos(θ)).toFixed(1);
  const ny = (cy - nLen * Math.sin(θ)).toFixed(1);

  const labels = [
    { text: "Weak",      x: 50,  y: 76  },
    { text: "Average",   x: 150, y: 25  },
    { text: "Good",      x: 222, y: 49  },
    { text: "Excellent", x: 267, y: 110 },
  ];

  return (
    <svg viewBox="0 0 300 165" className="w-full">
      <path d={arc} fill="none" stroke="#1a1d2e" strokeWidth="22" strokeLinecap="round" />
      {zones.map((z, i) => {
        const start = z.from * T;
        const len   = (z.to - z.from) * T;
        return (
          <path key={i} d={arc} fill="none" stroke={z.color} strokeWidth="18"
            strokeLinecap="butt"
            strokeDasharray={`${len.toFixed(1)} ${(T - len + 2).toFixed(1)}`}
            strokeDashoffset={`${(-start).toFixed(1)}`}
          />
        );
      })}
      {labels.map((l) => (
        <text key={l.text} x={l.x} y={l.y} fontSize="9" fill="#6b7280" textAnchor="middle">
          {l.text}
        </text>
      ))}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5.5" fill="white" />
    </svg>
  );
}

/* ─── Category score card ────────────────────────────────────────────────── */
function CategoryCard({ name, score }) {
  return (
    <Card className="border-white/10 bg-white/[0.03]">
      <CardContent className="p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground leading-snug">{name}</p>
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-white">
            {score}
            <span className="text-sm font-normal text-muted-foreground"> /100</span>
          </span>
          <Badge variant="outline" className={getBadgeClass(score)}>
            {getBadgeLabel(score)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default async function AnalysisPage({ params }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const analysis = await getResumeAnalysis(id);
  if (!analysis) notFound();

  const feedback = analysis.feedback;

  // Build category list for Tabs breakdown
  const breakdownCategories = feedback
    ? [
        { key: "toneAndStyle", title: "Tone & Style", score: feedback.toneAndStyle.score, tips: feedback.toneAndStyle.tips },
        { key: "content",      title: "Content",      score: feedback.content.score,      tips: feedback.content.tips },
        { key: "structure",    title: "Structure",    score: feedback.structure.score,    tips: feedback.structure.tips },
        { key: "skills",       title: "Skills",       score: feedback.skills.score,       tips: feedback.skills.tips },
        { key: "ats",          title: "ATS",          score: feedback.ATS.score,          tips: feedback.ATS.tips },
      ]
    : [];

  const atsTips    = feedback?.ATS?.tips ?? [];
  const atsGood    = atsTips.filter((t) => t.type === "good");
  const atsImprove = atsTips.filter((t) => t.type === "improve");

  return (
    <div className="space-y-0 -mt-4">
      {/* Back bar */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/resume-analyzer">
          <Button variant="ghost" size="sm" className="gap-2 rounded-full">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <div className="h-4 w-px bg-white/10" />
        <p className="text-sm text-muted-foreground truncate">
          {analysis.jobTitle} at {analysis.companyName}
        </p>
      </div>

      {/* ── ERROR ──────────────────────────────────────────────────────────── */}
      {analysis.status === "ERROR" && (
        <div className="rounded-2xl border border-white/10 p-12 text-center space-y-5">
          <div className="size-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Analysis Failed</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Something went wrong. Please delete this and try again.
            </p>
          </div>
          <Button asChild>
            <Link href="/resume-analyzer/new"><Plus className="h-4 w-4" /> Try Again</Link>
          </Button>
        </div>
      )}

      {/* ── PROCESSING ─────────────────────────────────────────────────────── */}
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

      {/* ── DONE ───────────────────────────────────────────────────────────── */}
      {feedback && (
        <div className="flex max-lg:flex-col gap-6">

          {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
          <aside className="lg:w-[280px] flex-shrink-0 space-y-4">
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
            <Card className="border-white/10 bg-white/[0.02]">
              <CardContent className="p-4 space-y-3.5">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Score Breakdown
                </p>
                <ScoreBar label="Overall"   score={feedback.overallScore} />
                <ScoreBar label="ATS"       score={feedback.ATS.score} />
                <ScoreBar label="Tone"      score={feedback.toneAndStyle.score} />
                <ScoreBar label="Content"   score={feedback.content.score} />
                <ScoreBar label="Structure" score={feedback.structure.score} />
                <ScoreBar label="Skills"    score={feedback.skills.score} />
              </CardContent>
            </Card>
          </aside>

          {/* ── RIGHT MAIN ───────────────────────────────────────────────── */}
          <main className="flex-1 space-y-6 min-w-0 max-w-5xl">

            {/* Gauge + category grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

              {/* Gauge card */}
              <Card className="lg:col-span-2 border-white/10 bg-[#0c0e14]">
                <CardContent className="p-5 flex flex-col items-center gap-1">
                  <p className="text-sm font-medium text-muted-foreground self-start">Overall Score</p>
                  <OverallGauge score={feedback.overallScore} />
                  <div className="flex items-end gap-2 -mt-1">
                    <span className="text-5xl font-bold text-white leading-none">{feedback.overallScore}</span>
                    <span className="text-base text-muted-foreground mb-1">/100</span>
                  </div>
                  <div className="mt-1 space-y-1 text-center">
                    <Badge variant="outline" className={getBadgeClass(feedback.overallScore)}>
                      {getBadgeLabel(feedback.overallScore)} Resume
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {analysis.jobTitle} at {analysis.companyName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Analyzed {new Date(analysis.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Category grid */}
              <div className="lg:col-span-3 grid grid-cols-2 gap-3 content-start">
                <CategoryCard name="ATS Compatibility" score={feedback.ATS.score} />
                <CategoryCard name="Tone & Style"      score={feedback.toneAndStyle.score} />
                <CategoryCard name="Content"           score={feedback.content.score} />
                <CategoryCard name="Structure"         score={feedback.structure.score} />
                <CategoryCard name="Skills"            score={feedback.skills.score} />
              </div>
            </div>

            {/* ATS Quick Tips */}
            {atsTips.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white">ATS Quick Tips</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Good tips */}
                  {atsGood.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-green-400 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> What&apos;s Working
                      </h4>
                      <ul className="space-y-2">
                        {atsGood.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                            <span className="text-white/70 leading-relaxed">{tip.tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Improve tips */}
                  {atsImprove.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" /> To Improve
                      </h4>
                      <ul className="space-y-2">
                        {atsImprove.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                            <span className="text-white/70 leading-relaxed">{tip.tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Detailed Breakdown — Tabs */}
            <ResumeBreakdown categories={breakdownCategories} />

            {/* CTA */}
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
