import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateRoadmap, createRoadmap } from "@/actions/roadmap";
import redis from "@/lib/redis";

export async function POST(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Distributed lock: prevent duplicate concurrent generations ────────────────
  // SET NX (only sets if key does NOT exist) with 120s TTL as safety net.
  // If the key already exists → another generation is in progress for this user.
  const lockKey = `lock:roadmap-gen:${userId}`;
  const acquired = await redis.set(lockKey, "1", { nx: true, ex: 120 });

  if (!acquired) {
    return NextResponse.json(
      { error: "A roadmap is already being generated. Please wait for it to finish." },
      { status: 429 }
    );
  }

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
    // Rate limit errors come through as thrown Errors with our message
    if (error?.message?.includes("limit")) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    console.error("Roadmap generation error:", error.message ?? error.code ?? "unknown");
    return NextResponse.json(
      { error: "Roadmap generation failed. Please try again." },
      { status: 500 }
    );
  } finally {
    // ── Always release the lock — whether success, error, or rate limit ──────────
    await redis.del(lockKey);
  }
}
