import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Star, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getVoiceInterviewById, getVoiceFeedbackByInterviewId } from "@/actions/interview";
import prisma from "@/lib/prisma";
import dayjs from "dayjs";

export const metadata = {
  title: "Interview Feedback — SensAI",
  description: "Your AI-powered interview performance feedback",
};

function ScoreCard({ name, score, comment }) {
  const color =
    score >= 80 ? "text-green-400" : score >= 60 ? "text-yellow-400" : "text-red-400";
  const progressColor =
    score >= 80 ? "bg-green-400" : score >= 60 ? "bg-yellow-400" : "bg-red-400";

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-white">{name}</span>
        <span className={`text-lg font-bold ${color}`}>{score}/100</span>
      </div>
      <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${progressColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-base text-muted-foreground">{comment}</p>
    </div>
  );
}

export default async function VoiceFeedbackPage({ params }) {
  const { id } = await params;

  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!dbUser) redirect("/onboarding");

  const interview = await getVoiceInterviewById(id);
  if (!interview) redirect("/interview");

  const feedback = await getVoiceFeedbackByInterviewId({
    interviewId: id,
    userId: dbUser.id,
  });

  if (!feedback) redirect(`/interview/voice/${id}`);

  const totalScore = feedback.totalScore;
  const scoreColor =
    totalScore >= 80 ? "text-green-400" : totalScore >= 60 ? "text-yellow-400" : "text-red-400";

  const strengths = feedback.strengths
    ? feedback.strengths.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const improvements = feedback.areasForImprovement
    ? feedback.areasForImprovement.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="space-y-8">
      {/* Header — flush left, no centering */}
      <div className="flex flex-col gap-3">
        <Link href="/interview/voice">
          <Button variant="link" className="gap-2 pl-0">
            <ArrowLeft className="h-4 w-4" />
            Back to Voice Interviews
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <Trophy className="h-7 w-7 text-yellow-400" />
          <h1 className="text-3xl font-bold gradient-title">Interview Feedback</h1>
        </div>
        <p className="text-muted-foreground capitalize">
          {interview.role} · {interview.level} · {interview.type} ·{" "}
          {dayjs(feedback.createdAt).format("MMM D, YYYY")}
        </p>
      </div>

      {/* Content — centered with max width */}
      <div className="space-y-8 max-w-6xl mx-auto">

      {/* Overall Score */}
      <Card className="border border-white/10 bg-gradient-to-b from-[#1A1C20] to-[#08090D]">
        <CardHeader>
          <CardTitle className="text-white">Overall Score</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className={`text-6xl font-bold ${scoreColor}`}>{totalScore}</div>
            <div>
              <p className="text-muted-foreground text-base">out of 100</p>
              <Progress value={totalScore} className="w-48 mt-2" />
            </div>
          </div>
          <p className="text-base text-muted-foreground italic">
            &ldquo;{feedback.finalAssessment}&rdquo;
          </p>
        </CardContent>
      </Card>

      {/* Category Scores */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Category Breakdown</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {feedback.categoryScores?.map((cat) => (
            <ScoreCard
              key={cat.name}
              name={cat.name}
              score={cat.score}
              comment={cat.comment}
            />
          ))}
        </div>
      </div>

      {/* Strengths & Improvements */}
      <div className="grid gap-6 sm:grid-cols-2">
        {strengths.length > 0 && (
          <Card className="border border-green-500/20 bg-green-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-green-400 flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {strengths.map((s, i) => (
                  <li key={i} className="text-base text-muted-foreground flex items-start gap-2">
                    <Star className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {improvements.length > 0 && (
          <Card className="border border-yellow-500/20 bg-yellow-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-yellow-400 flex items-center gap-2 text-base">
                <TrendingDown className="h-4 w-4" />
                Areas to Improve
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {improvements.map((s, i) => (
                  <li key={i} className="text-base text-muted-foreground flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5 shrink-0">→</span>
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* CTA */}
      <div className="flex gap-4 pt-4">
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
    </div>
  );
}
