import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateStepInstructions } from "@/actions/roadmap";

export async function POST(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { description } = await req.json();
    if (!description?.trim()) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    const instructions = await generateStepInstructions(description.trim());
    return NextResponse.json({ instructions });
  } catch (error) {
    console.error("Instructions generation error:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
