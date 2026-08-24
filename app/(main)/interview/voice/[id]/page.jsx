import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { auth } from "@clerk/nextjs/server";
import Agent from "../../_components/agent";
import DisplayTechIcons from "../../_components/display-tech-icons";
import { getVoiceInterviewById, getVoiceFeedbackByInterviewId } from "@/actions/interview";
import prisma from "@/lib/prisma";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const interview = await getVoiceInterviewById(id);
  return {
    title: interview ? `${interview.role} Interview — SensAI` : "Voice Interview — SensAI",
  };
}

export default async function VoiceInterviewSessionPage({ params }) {
  const { id } = await params;

  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const { userId: clerkUserId } = await auth();
  const dbUser = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!dbUser) redirect("/onboarding");

  const interview = await getVoiceInterviewById(id);
  if (!interview) redirect("/interview");

  const feedback = await getVoiceFeedbackByInterviewId({
    interviewId: id,
    userId: dbUser.id,
  });

  const userName =
    `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() ||
    clerkUser.emailAddresses[0]?.emailAddress;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link href="/interview/voice">
          <Button variant="link" className="gap-2 pl-0">
            <ArrowLeft className="h-4 w-4" />
            Back to Interview Prep
          </Button>
        </Link>

        <div className="flex flex-row gap-4 items-center justify-between flex-wrap">
          <div className="flex flex-row gap-3 items-center flex-wrap">
            <h1 className="capitalize text-2xl font-bold text-white">
              {interview.role} Interview
            </h1>
            <DisplayTechIcons techStack={interview.techstack} />
          </div>

          <span className="px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-muted-foreground">
            {interview.type}
          </span>
        </div>

        <p className="text-sm text-muted-foreground">
          {interview.level} level · {interview.questions.length} questions prepared
        </p>
      </div>

      {/* Agent */}
      <Agent
        userName={userName}
        userImageUrl={clerkUser.imageUrl}
        userId={dbUser.id}
        interviewId={id}
        type="interview"
        questions={interview.questions}
        feedbackId={feedback?.id}
        role={interview.role}
        level={interview.level}
        techstack={interview.techstack}
      />
    </div>
  );
}
