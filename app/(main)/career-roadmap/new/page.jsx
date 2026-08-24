import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import CreateRoadmapForm from "./_components/create-roadmap-form";

export const metadata = {
  title: "New Career Roadmap — SensAI",
  description: "Generate your AI-powered career roadmap",
};

/**
 * Convert stored industry slug (e.g. "tech-software-development")
 * into a human-readable career title (e.g. "Software Development").
 * We strip the first segment (broad category) and humanise the rest.
 */
function industryToCareer(industry) {
  if (!industry) return "";
  const parts = industry.split("-");
  // Drop the first segment (e.g. "tech", "finance") — keep the specialisation
  const specialisation = parts.slice(1).join(" ");
  return specialisation
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function NewRoadmapPage() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { industry: true, skills: true, experience: true },
  });

  const suggestedCareer = industryToCareer(user?.industry ?? "");
  const userSkills = user?.skills ?? [];
  const userExperience = user?.experience ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <Link href="/career-roadmap">
          <Button variant="link" className="gap-2 pl-0">
            <ArrowLeft className="h-4 w-4" />
            Back to Roadmaps
          </Button>
        </Link>
        <h1 className="text-4xl font-bold gradient-title">New Career Roadmap</h1>
        <p className="text-muted-foreground">
          AI will generate a roadmap tailored to your profile — skills, experience, and career goal.
        </p>
      </div>

      <CreateRoadmapForm
        suggestedCareer={suggestedCareer}
        userSkills={userSkills}
        userExperience={userExperience}
      />
    </div>
  );
}
