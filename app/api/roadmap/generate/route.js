import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateRoadmap, createRoadmap } from "@/actions/roadmap";

export async function POST(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { career, skills = [], experience = 0 } = await req.json();
    if (!career?.trim()) {
      return NextResponse.json({ error: "Career name is required" }, { status: 400 });
    }

    const { projectName, phases, roadmapNodes } = await generateRoadmap(
      career.trim(),
      { skills, experience }
    );

    const { success, roadmapId, error: saveError } = await createRoadmap({
      title: projectName,
      phases,
      roadmapNodes,
    });

    if (!success) {
      return NextResponse.json(
        { error: saveError ?? "Failed to save roadmap" },
        { status: saveError?.includes("limit") ? 403 : 500 }
      );
    }

    return NextResponse.json({ success: true, roadmapId, title: projectName });
  } catch (error) {
    console.error("Roadmap generation error:", error.message ?? error.code ?? "unknown");
    return NextResponse.json(
      { error: "Roadmap generation failed. Please try again." },
      { status: 500 }
    );
  }
}
