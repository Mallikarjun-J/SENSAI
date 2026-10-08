import { getAssessments } from "@/actions/interview";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatsCards from "./_components/stats-cards";
import PerformanceChart from "./_components/performance-chart";
import QuizList from "./_components/quiz-list";
import InterviewNav from "./_components/interview-tabs";
import prisma from "@/lib/prisma";
import { Suspense } from "react";

export const metadata = {
  title: "Interview Preparation — SensAI",
  description: "AI-powered quiz practice and voice interview tools",
};

export default async function InterviewPage() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!dbUser) redirect("/onboarding");

  const assessments = await getAssessments();
  const hasQuizHistory = assessments && assessments.length > 0;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold gradient-title mb-2">Interview Preparation</h1>
        <p className="text-muted-foreground">
          AI-powered tools to practise and ace your next interview.
        </p>
      </div>

      {/* Nav */}
      <Suspense>
        <InterviewNav />
      </Suspense>

      <div className="h-px bg-white/8" />

      {/* Quiz Practice section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Quiz Practice</h2>
              <p className="text-sm text-muted-foreground">MCQ-based questions tailored to your industry</p>
            </div>
          </div>
          <div className="self-start sm:self-auto">
            <Button asChild>
              <Link href="/interview/mock">
                <Plus className="h-4 w-4" />
                Start New Quiz
              </Link>
            </Button>
          </div>
        </div>

        <StatsCards assessments={assessments} />
        <PerformanceChart assessments={assessments} />

        {hasQuizHistory ? (
          <QuizList assessments={assessments} />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#1A1C20] to-[#08090D] p-12 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
              <ClipboardList className="h-8 w-8 text-blue-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg">No quiz results yet</p>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                Practice with industry-specific MCQ questions to sharpen your knowledge and track progress.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/interview/mock">
                <ClipboardList className="h-4 w-4" />
                Take Your First Quiz
              </Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
