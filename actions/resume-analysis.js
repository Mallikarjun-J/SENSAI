"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { analyzeResumeWithGemini, analyzeResumeWithGeminiText } from "@/lib/resume-ai";
import { UTApi } from "uploadthing/server";

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
      resumeKey: true,
      overallScore: true,
      status: true,
      createdAt: true,
      feedback: true,
    },
  });

  // For any builder analyses, fetch the resume title and template
  const builderResumeIds = analyses
    .filter((a) => a.resumeUrl === "builder" && a.resumeKey)
    .map((a) => a.resumeKey);

  let resumeMap = {};
  if (builderResumeIds.length > 0) {
    const resumes = await prisma.resume.findMany({
      where: { id: { in: builderResumeIds } },
      select: { id: true, title: true, template: true },
    });
    resumeMap = Object.fromEntries(resumes.map((r) => [r.id, r]));
  }

  return analyses.map((a) => ({
    ...a,
    resumeTitle: resumeMap[a.resumeKey]?.title || (a.feedback?.resumeTitle ?? "SensAI Resume"),
    resumeTemplate: resumeMap[a.resumeKey]?.template || "Standard",
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

  let resumeTitle = null;
  let resumeTemplate = null;
  if (analysis.resumeUrl === "builder" && analysis.resumeKey) {
    const resume = await prisma.resume.findFirst({
      where: { id: analysis.resumeKey, userId: user.id },
      select: { title: true, template: true },
    });
    if (resume) {
      resumeTitle = resume.title;
      resumeTemplate = resume.template;
    }
  }

  return {
    ...analysis,
    resumeTitle: resumeTitle || (analysis.feedback?.resumeTitle ?? "SensAI Resume"),
    resumeTemplate: resumeTemplate || "Standard",
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

// ─── Helper: Convert Resume Builder JSON → plain text ────────────────────────

function resumeJsonToText(resume) {
  const lines = [];

  // Personal Info
  const p = resume.personalInfo ?? {};
  if (p.fullName) lines.push(`Name: ${p.fullName}`);
  if (p.profession) lines.push(`Profession: ${p.profession}`);
  if (p.email) lines.push(`Email: ${p.email}`);
  if (p.phone) lines.push(`Phone: ${p.phone}`);
  if (p.location) lines.push(`Location: ${p.location}`);
  if (Array.isArray(p.links) && p.links.length > 0) {
    lines.push("Links: " + p.links.map((l) => `${l.label}: ${l.url}`).join(" | "));
  }

  // Professional Summary
  if (resume.professionalSummary) {
    lines.push("\nPROFESSIONAL SUMMARY");
    lines.push(resume.professionalSummary);
  }

  // Skills
  if (Array.isArray(resume.skills) && resume.skills.length > 0) {
    lines.push("\nSKILLS");
    resume.skills.forEach((s) => lines.push(s));
  }

  // Experience
  if (Array.isArray(resume.experience) && resume.experience.length > 0) {
    lines.push("\nWORK EXPERIENCE");
    resume.experience.forEach((exp) => {
      lines.push(
        `${exp.position || ""} at ${exp.company || ""} (${exp.startDate || ""}${exp.isCurrent ? " – Present" : exp.endDate ? ` – ${exp.endDate}` : ""})`
      );
      if (exp.description) lines.push(exp.description);
    });
  }

  // Education
  if (Array.isArray(resume.education) && resume.education.length > 0) {
    lines.push("\nEDUCATION");
    resume.education.forEach((edu) => {
      lines.push(
        `${edu.degree || ""} in ${edu.field || ""} — ${edu.institution || ""} (${edu.graduationDate || ""})`
      );
      if (edu.gpa) lines.push(`GPA: ${edu.gpa}`);
    });
  }

  // Projects
  if (Array.isArray(resume.projects) && resume.projects.length > 0) {
    lines.push("\nPROJECTS");
    resume.projects.forEach((proj) => {
      lines.push(`${proj.name || ""}${proj.type ? ` (${proj.type})` : ""}${proj.link ? ` [Link: ${proj.link}]` : ""}`);
      if (proj.description) lines.push(proj.description);
    });
  }

  return lines.join("\n");
}

// ─── Analyze from Resume Builder (no PDF upload needed) ──────────────────────

export async function analyzeResumeFromBuilder({ resumeId, companyName, jobTitle, jobDescription }) {
  const user = await getDbUser();

  // Fetch the resume, verify ownership
  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, userId: user.id },
  });
  if (!resume) throw new Error("Resume not found");

  // Convert JSON → text
  const resumeText = resumeJsonToText(resume);
  if (!resumeText.trim()) throw new Error("Resume appears to be empty. Please fill in your resume before analyzing.");

  // Run Gemini text analysis
  const feedback = await analyzeResumeWithGeminiText({
    resumeText,
    jobTitle,
    jobDescription,
  });

  // Create + immediately complete the analysis record
  const analysis = await prisma.resumeAnalysis.create({
    data: {
      userId: user.id,
      companyName,
      jobTitle,
      jobDescription,
      resumeUrl: "builder",       // placeholder — no PDF
      resumeKey: resumeId,        // store builder resumeId here
      feedback,
      overallScore: feedback.overallScore,
      status: "DONE",
    },
  });

  revalidatePath("/resume-analyzer");
  return { id: analysis.id };
}
