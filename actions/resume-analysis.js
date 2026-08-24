"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { analyzeResumeWithGemini } from "@/lib/resume-ai";
import { UTApi } from "uploadthing/server";

const ANALYSIS_LIMIT = 5;

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getDbUser() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");
  const user = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!user) throw new Error("User not found");
  return user;
}

// ─── Create analysis record (PENDING) ────────────────────────────────────────

export async function createResumeAnalysis({ companyName, jobTitle, jobDescription, resumeUrl, resumeKey }) {
  const user = await getDbUser();

  const count = await prisma.resumeAnalysis.count({ where: { userId: user.id } });
  if (count >= ANALYSIS_LIMIT) {
    throw new Error(`You've reached the ${ANALYSIS_LIMIT}-analysis limit. Delete one to continue.`);
  }

  const analysis = await prisma.resumeAnalysis.create({
    data: {
      userId: user.id,
      companyName,
      jobTitle,
      jobDescription,
      resumeUrl,
      resumeKey,
      status: "PENDING",
    },
  });

  return analysis;
}

// ─── Run Gemini analysis ──────────────────────────────────────────────────────

export async function analyzeResumeAction(analysisId) {
  const user = await getDbUser();

  const analysis = await prisma.resumeAnalysis.findFirst({
    where: { id: analysisId, userId: user.id },
  });
  if (!analysis) throw new Error("Analysis not found");

  await prisma.resumeAnalysis.update({
    where: { id: analysisId },
    data: { status: "PROCESSING" },
  });

  try {
    const feedback = await analyzeResumeWithGemini({
      pdfUrl: analysis.resumeUrl,
      jobTitle: analysis.jobTitle,
      jobDescription: analysis.jobDescription,
    });

    await prisma.resumeAnalysis.update({
      where: { id: analysisId },
      data: {
        feedback,
        overallScore: feedback.overallScore,
        status: "DONE",
      },
    });

    revalidatePath("/resume-analyzer");
    revalidatePath(`/resume-analyzer/${analysisId}`);

    return { success: true, analysisId };
  } catch (error) {
    await prisma.resumeAnalysis.update({
      where: { id: analysisId },
      data: { status: "ERROR" },
    });
    throw error;
  }
}

// ─── Get all analyses for current user ───────────────────────────────────────

export async function getResumeAnalyses() {
  const user = await getDbUser();

  const analyses = await prisma.resumeAnalysis.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      companyName: true,
      jobTitle: true,
      resumeUrl: true,
      overallScore: true,
      status: true,
      createdAt: true,
    },
  });

  return analyses.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  }));
}

// ─── Get single analysis ──────────────────────────────────────────────────────

export async function getResumeAnalysis(id) {
  const user = await getDbUser();

  const analysis = await prisma.resumeAnalysis.findFirst({
    where: { id, userId: user.id },
  });

  if (!analysis) return null;
  return {
    ...analysis,
    createdAt: analysis.createdAt.toISOString(),
    updatedAt: analysis.updatedAt.toISOString(),
  };
}

// ─── Delete analysis ──────────────────────────────────────────────────────────

export async function deleteResumeAnalysis(id) {
  const user = await getDbUser();

  // Fetch the resumeKey so we can delete the file from UploadThing
  const record = await prisma.resumeAnalysis.findFirst({
    where: { id, userId: user.id },
    select: { resumeKey: true },
  });

  // Delete from UploadThing CDN (best-effort — don't block DB delete if this fails)
  if (record?.resumeKey) {
    try {
      const utapi = new UTApi();
      await utapi.deleteFiles([record.resumeKey]);
    } catch (e) {
      console.error("[deleteResumeAnalysis] UploadThing delete failed:", e);
    }
  }

  await prisma.resumeAnalysis.deleteMany({
    where: { id, userId: user.id },
  });

  revalidatePath("/resume-analyzer");
  return { success: true };
}

// ─── Get analysis count ───────────────────────────────────────────────────────

export async function getResumeAnalysisCount() {
  const user = await getDbUser();
  return prisma.resumeAnalysis.count({ where: { userId: user.id } });
}
