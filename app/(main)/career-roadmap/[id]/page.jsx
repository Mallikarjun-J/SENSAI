import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getRoadmapById } from "@/actions/roadmap";
import RoadmapViewer from "./_components/roadmap-viewer";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const roadmap = await getRoadmapById(id);
  return {
    title: roadmap ? `${roadmap.title} — SensAI` : "Career Roadmap — SensAI",
  };
}

export default async function RoadmapPage({ params }) {
  const { id } = await params;

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const roadmap = await getRoadmapById(id);
  if (!roadmap) redirect("/career-roadmap");

  return <RoadmapViewer roadmap={roadmap} />;
}
