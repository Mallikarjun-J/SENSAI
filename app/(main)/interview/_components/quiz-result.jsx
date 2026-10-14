"use client";

import { Trophy, CheckCircle2, XCircle, Sparkles, BookOpen, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatPlainText } from "@/lib/utils";

export default function QuizResult({
  result,
  hideStartNew = false,
  onStartNew,
}) {
  if (!result) return null;

  const questions = result.questions || [];
  const totalQuestions = questions.length;
  const correctCount = questions.filter((q) => q.isCorrect).length;
  const incorrectCount = totalQuestions - correctCount;
  const score = Number(result.quizScore ?? 0);

  const getScoreBadge = () => {
    if (score >= 80) {
      return {
        label: "Excellent Performance",
        color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      };
    }
    if (score >= 60) {
      return {
        label: "Good Effort",
        color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      };
    }
    return {
      label: "Needs Practice",
      color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    };
  };

  const badge = getScoreBadge();

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Trophy className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold gradient-title">
              Quiz Results
            </h2>
            <p className="text-sm text-muted-foreground">
              Review your answers and AI-driven recommendations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className={`text-xs sm:text-sm font-medium px-3.5 py-1.5 rounded-full border ${badge.color}`}
          >
            {badge.label}
          </span>
        </div>
      </div>

      {/* Score Overview Cards */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Total Score */}
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Final Score
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-white">
                {score.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Correct Answers */}
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              Correct Answers
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-emerald-400">
                {correctCount}
              </span>
              <span className="text-sm text-muted-foreground font-normal">
                / {totalQuestions}
              </span>
            </div>
          </div>

          {/* Incorrect Answers */}
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5 text-rose-400" />
              Incorrect Answers
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-rose-400">
                {incorrectCount}
              </span>
              <span className="text-sm text-muted-foreground font-normal">
                / {totalQuestions}
              </span>
            </div>
          </div>
        </div>

        {/* Score Progress Bar */}
        <div className="pt-2">
          <Progress value={score} className="h-2.5 w-full bg-white/10" />
        </div>
      </div>

      {/* Improvement Tip */}
      {result.improvementTip && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 sm:p-5 md:p-6 space-y-2.5">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm sm:text-base">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>AI Knowledge Gap &amp; Improvement Tips</span>
          </div>
          <p className="text-sm sm:text-base text-zinc-300 whitespace-pre-line leading-relaxed">
            {formatPlainText(result.improvementTip)}
          </p>
        </div>
      )}

      {/* Questions Review */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            Question Review
          </h3>
          <span className="text-xs text-muted-foreground">
            {totalQuestions} questions total
          </span>
        </div>

        <div className="space-y-4">
          {questions.map((q, index) => (
            <div
              key={index}
              className="border border-white/10 bg-white/[0.02] rounded-xl p-4 sm:p-6 space-y-4 transition-all"
            >
              {/* Question Header & Status */}
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-muted-foreground shrink-0">
                  Question {index + 1}
                </span>
                {q.isCorrect ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Correct
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/20 shrink-0">
                    <XCircle className="h-3.5 w-3.5" /> Incorrect
                  </span>
                )}
              </div>

              {/* Question Text */}
              <p className="text-base sm:text-lg font-medium text-white whitespace-pre-line leading-relaxed">
                {formatPlainText(q.question)}
              </p>

              {/* Answer comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* User's Answer */}
                <div
                  className={`p-3.5 rounded-lg border text-sm space-y-1 ${
                    q.isCorrect
                      ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200 sm:col-span-2"
                      : "bg-rose-950/20 border-rose-500/30 text-rose-200"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Your Answer {q.isCorrect ? "(Correct)" : ""}
                  </p>
                  <p className="font-medium whitespace-pre-line">
                    {formatPlainText(q.userAnswer) || "No answer recorded"}
                  </p>
                </div>

                {/* Correct Answer (if user got it wrong) */}
                {!q.isCorrect && (
                  <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 text-emerald-200 text-sm space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/80">
                      Correct Answer
                    </p>
                    <p className="font-medium whitespace-pre-line">
                      {formatPlainText(q.answer)}
                    </p>
                  </div>
                )}
              </div>

              {/* Explanation */}
              {q.explanation && (
                <div className="bg-zinc-900/60 border border-white/5 rounded-lg p-3.5 sm:p-4 text-sm space-y-1.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    <span>Explanation</span>
                  </div>
                  <p className="text-zinc-300 text-sm whitespace-pre-line leading-relaxed">
                    {formatPlainText(q.explanation)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Start New Quiz Button */}
      {!hideStartNew && (
        <div className="pt-2 flex justify-center">
          <Button
            onClick={onStartNew}
            className="w-full sm:w-auto sm:min-w-[200px] flex items-center justify-center gap-2 font-semibold"
          >
            <RotateCcw className="h-4 w-4" />
            Start New Quiz
          </Button>
        </div>
      )}
    </div>
  );
}