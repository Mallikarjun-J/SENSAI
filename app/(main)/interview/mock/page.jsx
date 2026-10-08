import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import MockQuizWrapper from "../_components/mock-quiz-wrapper";

export const metadata = {
  title: "Mock Quiz — SensAI",
  description: "Configure and take a custom AI-generated MCQ quiz",
};

// "tech-software-development" → "Software Development"
function industryToTopic(industry) {
  if (!industry) return "";
  return industry
    .split("-")
    .slice(1)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function MockInterviewPage() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { industry: true, skills: true },
  });

  const defaultTopic = industryToTopic(dbUser?.industry);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <Link href="/interview">
          <Button variant="link" className="gap-2 pl-0">
            <ArrowLeft className="h-4 w-4" />
            Back to Interview Preparation
          </Button>
        </Link>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-title">
          Mock Quiz
        </h1>
        <p className="text-muted-foreground">
          Configure your quiz and let AI generate targeted MCQ questions for you.
        </p>
      </div>

      <MockQuizWrapper
        defaultTopic={defaultTopic}
        defaultTopics={[]}
      />
    </div>
  );
}
