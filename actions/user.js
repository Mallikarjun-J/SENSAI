"use server"
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { generateAIInsights } from "./dashboard";

export async function updateUser(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.User.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    // Start a transaction to handle both operations
    const result = await prisma.$transaction(
      async (tx) => {
        // First check if industry exists
        let industryInsight = await tx.IndustryInsight.findUnique({
          where: {
            industry: data.industry,
          },
        });

        // If industry doesn't exist, create it with default values
        if (!industryInsight) {
          const insights = await generateAIInsights(data.industry);

          industryInsight = await prisma.industryInsight.create({
            data: {
              industry: data.industry,
              ...insights,
              nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
        }

        // Now update the user
        const updatedUser = await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            industry: data.industry,
            experience: data.experience,
            bio: data.bio,
            skills: data.skills,
          },
        });

        return { updatedUser, industryInsight };
      },
      {
        timeout: 10000, // default: 5000
      }
    );

    revalidatePath("/");
    return { success: true, ...result};
  } catch (error) {
    console.error("Error updating user and industry:", error.message);
    throw new Error("Failed to update profile");
  }
}

export async function getUserOnboardingStatus() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  // if (!user) throw new Error("User not found");

  try {
    const user = await prisma.user.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        industry: true,
      },
    });

    return {
      isOnboarded: !!user?.industry,
    };
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    throw new Error("Failed to check onboarding status");
  }
}

// ─── Get profile fields for the edit modal ────────────────────────────────────

export async function getUserProfile() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: { experience: true, skills: true, bio: true, industry: true },
  });

  if (!user) throw new Error("User not found");
  return {
    experience: user.experience ?? 0,
    skills: user.skills ?? [],
    bio: user.bio ?? "",
    industry: user.industry ?? "",
  };
}

// ─── Update only experience / skills / bio ────────────────────────────────────

export async function updateUserProfile({ experience, skills, bio }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!user) throw new Error("User not found");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      experience: Number(experience),
      skills,
      bio,
    },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

/* ── AI normalization — called when modal opens ───────────────────────────── */
export async function normalizeSkillTitles(rawTitles = []) {
  if (!rawTitles.length) return { recognized: [], skipped: [] };

  const stripPrefix = (t) =>
    t.replace(
      /^(learn|master|understand|intro to|introduction to|getting started with|basics of|overview of|explore|study|practice|implement|build with|work with)\s+/i,
      ""
    ).trim();

  // Default fallback: treat all as recognized after prefix strip
  let results = rawTitles.map((t) => ({ original: t, normalized: stripPrefix(t), kept: true }));

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.ROADMAP_API);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const aiResult = await model.generateContent(
      `You are a technical recruiter extracting resume-worthy skills.
Given roadmap step titles, return the industry-standard skill name ONLY if it is a specific, concrete technology, tool, programming language, framework, library, or platform — something that appears as a skill on a LinkedIn profile or CV.

INCLUDE examples: Git, Docker, React, Python, PostgreSQL, AWS, TypeScript, MongoDB, Redis
EXCLUDE examples: "Database Optimization", "API Security", "User Authentication", "Developer Tools", "Code Review", "Project Structure", "Databases", "Backend Development", "Web Fundamentals" — these are practices, concepts, or topics, NOT skills

Rules:
- If the title maps to a valid concrete skill → return the clean industry name (1–3 words, Title Case)
- If the title is a concept, practice, or too generic → return null in its place
- Return ONLY a valid JSON array of strings/nulls, same length and order as input, no explanation

Input: ${JSON.stringify(rawTitles)}
Output:`
    );

    const text = aiResult.response.text().trim();
    const match = text.match(/\[[\s\S]*?\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed) && parsed.length === rawTitles.length) {
        results = rawTitles.map((original, i) => {
          const val = parsed[i];
          const normalized = val == null ? null : String(val).trim();
          return { original, normalized: normalized || stripPrefix(original), kept: val != null };
        });
      }
    }
  } catch {
    // Use fallback results already set above
  }

  return {
    recognized: results.filter((r) => r.kept).map((r) => r.normalized),
    skipped:    results.filter((r) => !r.kept).map((r) => r.normalized),
  };
}

/* ── DB write — called after user reviews and confirms ───────────────────── */
export async function saveSkillsToProfile(skillNames = []) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, skills: true },
  });
  if (!user) throw new Error("User not found");
  if (!skillNames.length) return { success: true, added: [] };

  // Deduplicate case-insensitively (against existing + within batch)
  const existingLower = new Set(user.skills.map((s) => s.toLowerCase()));
  const toAdd = [];
  for (const skill of skillNames) {
    if (!skill?.trim()) continue;
    if (!existingLower.has(skill.toLowerCase())) {
      toAdd.push(skill.trim());
      existingLower.add(skill.toLowerCase());
    }
  }

  if (toAdd.length > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: { skills: [...user.skills, ...toAdd] },
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/career-roadmap");
  return { success: true, added: toAdd };
}

// ─── Account Deletion ─────────────────────────────────────────────────────────

/**
 * Permanently deletes the current user's account.
 *
 * Deletion order (required by FK constraints):
 *  1. UploadThing files (best-effort, before DB rows are gone)
 *  2. Assessment rows  (no onDelete cascade in schema)
 *  3. CoverLetter rows (no onDelete cascade in schema)
 *  4. User row → cascades Resume, Interview, VoiceFeedback, Roadmap, ResumeAnalysis
 *  5. Clerk user record
 */
export async function deleteAccount() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  // 1. Best-effort: delete uploaded resume files from UploadThing CDN
  try {
    const { UTApi } = await import("uploadthing/server");
    const analyses = await prisma.resumeAnalysis.findMany({
      where: { userId: user.id },
      select: { resumeKey: true },
    });
    const keys = analyses.map((a) => a.resumeKey).filter(Boolean);
    if (keys.length > 0) {
      const utapi = new UTApi();
      await utapi.deleteFiles(keys);
    }
  } catch {
    // Non-blocking — proceed with DB deletion even if CDN cleanup fails
  }

  // 2. Delete models without cascade (Assessment, CoverLetter)
  await prisma.assessment.deleteMany({ where: { userId: user.id } });
  await prisma.coverLetter.deleteMany({ where: { userId: user.id } });

  // 3. Delete User — cascades: Resume, Interview→VoiceFeedback, Roadmap, ResumeAnalysis
  await prisma.user.delete({ where: { id: user.id } });

  // 4. Delete from Clerk
  const { clerkClient } = await import("@clerk/nextjs/server");
  const clerk = await clerkClient();
  await clerk.users.deleteUser(clerkUserId);

  return { success: true };
}
