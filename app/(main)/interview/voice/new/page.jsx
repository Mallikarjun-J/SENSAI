import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import VoiceInterviewForm from "../_components/voice-interview-form";
import prisma from "@/lib/prisma";

// Map years of experience → interview level
function experienceToLevel(years) {
  if (!years || years <= 2) return "Junior";
  if (years <= 5) return "Mid";
  if (years <= 9) return "Senior";
  return "Lead";
}

// "tech-software-development" → "Software Development"
function industryToRole(industry) {
  if (!industry) return "";
  const parts = industry.split("-");
  // Drop the first segment (broad category like "tech") and title-case the rest
  return parts
    .slice(1)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const metadata = {
  title: "New Voice Interview — SensAI",
  description: "Set up your AI-powered live voice interview session",
};

export default async function VoiceInterviewSetupPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { clerkUserId: clerkUser.id },
    select: { id: true, industry: true, experience: true, skills: true },
  });

  const defaultRole = industryToRole(dbUser?.industry);
  const defaultLevel = experienceToLevel(dbUser?.experience);
  const defaultTechstack = dbUser?.skills ?? [];

  const resumes = dbUser
    ? await prisma.resume.findMany({
        where: { userId: dbUser.id },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, updatedAt: true },
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <Link href="/interview/voice">
          <Button variant="link" className="gap-2 pl-0">
            <ArrowLeft className="h-4 w-4" />
            Back to Voice Interviews
          </Button>
        </Link>
        <h1 className="text-4xl font-bold gradient-title">New Voice Interview</h1>
        <p className="text-muted-foreground">
          Configure your session and let AI generate personalised questions for you.
        </p>
      </div>

      <VoiceInterviewForm
        userId={clerkUser.id}
        userName={`${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || clerkUser.emailAddresses[0]?.emailAddress}
        defaultRole={defaultRole}
        defaultLevel={defaultLevel}
        defaultTechstack={defaultTechstack}
        resumes={resumes.map((r) => ({ id: r.id, title: r.title, updatedAt: r.updatedAt.toISOString() }))}
      />
    </div>
  );
}
