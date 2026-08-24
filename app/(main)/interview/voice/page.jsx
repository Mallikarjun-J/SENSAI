import { getVoiceInterviewsByUserId, getVoiceFeedbacksForUser } from "@/actions/interview";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Mic, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import VoiceInterviewCard from "../_components/voice-interview-card";
import VoiceStatsCards from "../_components/voice-stats-cards";
import VoicePerformanceChart from "../_components/voice-performance-chart";
import InterviewNav from "../_components/interview-tabs";
import prisma from "@/lib/prisma";
import { Suspense } from "react";

export const metadata = {
  title: "Voice Interviews — SensAI",
  description: "AI-powered live voice interview practice with instant feedback",
};

export default async function VoiceInterviewPage() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!dbUser) redirect("/onboarding");

  const [voiceInterviews, voiceFeedbacks] = await Promise.all([
    getVoiceInterviewsByUserId(),
    getVoiceFeedbacksForUser(),
  ]);

  const VOICE_LIMIT = 7;
  const voiceLimitReached = (voiceInterviews?.length ?? 0) >= VOICE_LIMIT;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-6xl font-bold gradient-title mb-2">Interview Preparation</h1>
        <p className="text-muted-foreground">
          AI-powered tools to practise and ace your next interview.
        </p>
      </div>

      {/* Nav */}
      <Suspense>
        <InterviewNav />
      </Suspense>

      <div className="h-px bg-white/8" />

      {/* Voice Interview section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Mic className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Voice Interviews</h2>
              <p className="text-sm text-muted-foreground">Real-time AI voice interview with instant feedback</p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <span className={`text-sm font-medium px-3 py-1 rounded-full border ${
              voiceLimitReached
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-white/5 border-white/10 text-muted-foreground"
            }`}>
              {voiceInterviews?.length ?? 0} / {VOICE_LIMIT}
            </span>
            {voiceLimitReached ? (
              <Button disabled className="rounded-full gap-2 opacity-50 cursor-not-allowed">
                <Plus className="h-4 w-4" />
                Limit Reached
              </Button>
            ) : (
              <Button asChild >
                <Link href="/interview/voice/new">
                  <Plus className="h-4 w-4" />
                  New Voice Interview
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Stats + Performance */}
        <VoiceStatsCards feedbacks={voiceFeedbacks} />
        <VoicePerformanceChart feedbacks={voiceFeedbacks} />

        {/* Recent Interviews card */}
        <div className="rounded-2xl border border-white/20 bg-gradient-to-b from-[#1A1C20] to-[#08090D]">
          <div className="flex items-center justify-between p-6 pb-4">
            <div>
              <h3 className="gradient-title text-3xl md:text-4xl font-bold">Recent Interviews</h3>
              <p className="text-muted-foreground text-sm mt-1">Review your past voice interview performance</p>
            </div>
            {voiceLimitReached ? (
              <Button disabled className="rounded-full gap-2 opacity-50 cursor-not-allowed">
                <Mic className="h-4 w-4" />
                Limit Reached
              </Button>
            ) : (
              <Button asChild >
                <Link href="/interview/voice/new">
                  <Mic className="h-4 w-4" />
                  Start New Interview
                </Link>
              </Button>
            )}
          </div>

          <div className="px-6 pb-6">
            {voiceInterviews && voiceInterviews.length > 0 ? (
              <div className="flex flex-wrap gap-5">
                {voiceInterviews.map((interview) => (
                  <VoiceInterviewCard
                    key={interview.id}
                    interviewId={interview.id}
                    userId={dbUser.id}
                    role={interview.role}
                    type={interview.type}
                    techstack={interview.techstack}
                    createdAt={interview.createdAt}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 p-10 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto">
                  <Mic className="h-7 w-7 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">No voice interviews yet</p>
                  <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                    Start a live AI voice interview and get instant detailed feedback on your answers.
                  </p>
                </div>
                <Button asChild >
                  <Link href="/interview/voice/new">
                    <Mic className="h-4 w-4" />
                    Start Your First Interview
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
