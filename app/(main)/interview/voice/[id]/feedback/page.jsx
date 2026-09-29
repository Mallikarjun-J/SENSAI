import { ArrowLeft, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getVoiceInterviewById, getVoiceFeedbackByInterviewId } from "@/actions/interview";
import prisma from "@/lib/prisma";
import dayjs from "dayjs";
import DetailedBreakdown from "./_components/detailed-breakdown";

export const metadata = {
  title: "Interview Feedback — SensAI",
  description: "Your AI-powered interview performance feedback",
};

/* ─── helpers ────────────────────────────────────────────────────────────── */

export function getBadgeClass(score) {
  if (score >= 80) return "bg-green-500/20 text-green-400 border-green-500/30";
  if (score >= 60) return "bg-lime-500/20 text-lime-400 border-lime-500/30";
  if (score >= 40) return "bg-orange-500/20 text-orange-400 border-orange-500/30";
  return "bg-red-500/20 text-red-400 border-red-500/30";
}

export function getBadgeLabel(score) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Moderate";
  return "Weak";
}

function ScoreBadge({ score }) {
  return (
    <Badge variant="outline" className={getBadgeClass(score)}>
      {getBadgeLabel(score)}
    </Badge>
  );
}

/* ─── SVG gauge ──────────────────────────────────────────────────────────── */
/*
 * Half-circle speedometer.
 * cx=150, cy=148, r=108  → arc from (42,148) → top (150,40) → (258,148)
 * SVG sweep=1 (clockwise in SVG = over the top).
 * T = π × r ≈ 339.3 (semicircle arc length).
 * Score 0 → left; score 100 → right.
 * Needle: θ = 180° − score × 1.8°
 */
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

  // Label positions outside arc at r=126, zone midpoints
  const labels = [
    { text: "Weak",      x: 50,  y: 76  },
    { text: "Moderate",  x: 150, y: 25  },
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

/* ─── Category card ──────────────────────────────────────────────────────── */
function CategoryCard({ name, score }) {
  return (
    <Card className="border-white/10 bg-white/[0.03]">
      <CardContent className="p-4 space-y-3">
        <p className="text-sm font-medium text-white leading-snug">{name}</p>
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-white">
            {score}
            <span className="text-sm font-normal text-muted-foreground"> /100</span>
          </span>
          <ScoreBadge score={score} />
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default async function VoiceFeedbackPage({ params }) {
  const { id } = await params;

  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!dbUser) redirect("/onboarding");

  const interview = await getVoiceInterviewById(id);
  if (!interview) redirect("/interview");

  const feedback = await getVoiceFeedbackByInterviewId({ interviewId: id, userId: dbUser.id });
  if (!feedback) redirect(`/interview/voice/${id}`);

  // Parse bullet lists — handles |||, "1. 2. 3." numbered, or newline formats
  function parseBullets(str) {
    if (!str) return [];
    if (str.includes("|||"))
      return str.split("|||").map((s) => s.trim()).filter(Boolean);
    // numbered list: "1. item 2. item"
    const byNumber = str.split(/(?<!\d)\d+\.\s+/).map((s) => s.trim()).filter(Boolean);
    if (byNumber.length > 1) return byNumber;
    // newline-separated
    const byLine = str.split(/\n+/).map((s) => s.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
    if (byLine.length > 1) return byLine;
    return [str.trim()];
  }

  const strengths    = parseBullets(feedback.strengths);
  const improvements = parseBullets(feedback.areasForImprovement);

  const categories = Array.isArray(feedback.categoryScores) ? feedback.categoryScores : [];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <Link href="/interview/voice">
          <Button variant="link" className="gap-2 pl-0 text-muted-foreground -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <h1 className="text-4xl font-bold text-white mt-1 capitalize">
          {interview.role} Feedback
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {dayjs(feedback.createdAt).format("MMMM D, YYYY")}
          {interview.level && ` · ${interview.level}`}
          {interview.type  && ` · ${interview.type} interview`}
        </p>
      </div>

      {/* ── Score overview ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Gauge card */}
        <Card className="lg:col-span-2 border-white/10 bg-[#0c0e14]">
          <CardContent className="p-5 flex flex-col items-center gap-1">
            <p className="text-sm font-medium text-muted-foreground self-start">Overall Score</p>
            <OverallGauge score={feedback.totalScore} />
            <div className="flex items-end gap-2 -mt-1">
              <span className="text-5xl font-bold text-white leading-none">{feedback.totalScore}</span>
              <span className="text-base text-muted-foreground mb-1">/100</span>
            </div>
            <div className="mt-1">
              <ScoreBadge score={feedback.totalScore} />
            </div>
          </CardContent>
        </Card>

        {/* Category grid */}
        <div className="lg:col-span-3 grid grid-cols-2 gap-3 content-start">
          {categories.map((cat, i) => (
            <CategoryCard key={i} name={cat.name} score={cat.score} />
          ))}
        </div>
      </div>

      {/* ── Overall Performance ─────────────────────────────────────────── */}
      {feedback.finalAssessment && (
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white">Overall Performance</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {feedback.finalAssessment}
          </p>
        </div>
      )}

      {/* ── Strengths & Improvements ────────────────────────────────────── */}
      {(strengths.length > 0 || improvements.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {strengths.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white">What You Are Doing Well</h3>
              <ul className="space-y-2.5">
                {strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {improvements.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white">Top Things You Can Improve</h3>
              <ul className="space-y-2.5">
                {improvements.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Detailed Breakdown ──────────────────────────────────────────── */}
      {categories.length > 0 && <DetailedBreakdown categories={categories} />}

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-4">
        <Button asChild className="flex-1 gap-2">
          <Link href={`/interview/voice/${id}`}>
            <RotateCcw className="h-4 w-4" />
            Repeat Interview
          </Link>
        </Button>
        <Button variant="outline" asChild className="flex-1">
          <Link href="/interview/voice">Back to Voice Interviews</Link>
        </Button>
      </div>
    </div>
  );
}
