import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { Map, Plus } from "lucide-react";
import { getRoadmapsByUser } from "@/actions/roadmap";
import RoadmapCard from "./_components/roadmap-card";

export const metadata = {
  title: "Career Roadmap - SensAI",
  description: "Your AI-generated interactive career roadmaps",
};

export default async function CareerRoadmapPage() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) redirect("/sign-in");

  const roadmaps = await getRoadmapsByUser();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-title">Career Roadmap</h1>
          <p className="text-muted-foreground mt-2">
            AI-generated visual roadmaps tailored to your career goal.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Button asChild>
            <Link href="/career-roadmap/new">
              <Plus className="h-4 w-4" />
              New Roadmap
            </Link>
          </Button>
        </div>
      </div>

      {/* Roadmap grid */}
      {roadmaps.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {roadmaps.map((roadmap) => (
            <RoadmapCard key={roadmap.id} roadmap={roadmap} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#1A1C20] to-[#08090D] p-12 text-center space-y-5">
          <div className="flex items-center justify-center mx-auto size-20 rounded-2xl border border-white/10"
            style={{ background: "rgba(167,139,250,0.1)" }}>
            <Map className="h-10 w-10" style={{ color: "#a78bfa" }} />
          </div>
          <div>
            <p className="text-white font-semibold text-lg">No roadmaps yet</p>
            <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
              Tell the AI your career goal and it will generate a structured, phase-by-phase
              interactive learning roadmap for you.
            </p>
          </div>
          <Button asChild>
            <Link href="/career-roadmap/new">
              <Plus className="h-4 w-4" />
              Generate Your First Roadmap
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
