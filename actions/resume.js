"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

// ─── AI clients ──────────────────────────────────────────────────────────────

// Gemini flash-lite via OpenAI-compat (for enhance/parse text actions)
function getFlashLite() {
  return new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  });
}

// Gemini native client (for PDF parsing)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Helper ───────────────────────────────────────────────────────────────────

async function getDbUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) throw new Error("User not found");
  return user;
}

// ─── CRUD actions ─────────────────────────────────────────────────────────────

export async function getUserResumes() {
  const user = await getDbUser();
  const resumes = await prisma.resume.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      template: true,
      ascentColor: true,
      updatedAt: true,
    },
  });
  return resumes.map((r) => ({
    id: r.id,
    title: r.title,
    template: r.template,
    ascentColor: r.ascentColor,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getResumeCount() {
  const user = await getDbUser();
  return prisma.resume.count({ where: { userId: user.id } });
}

export async function createResume({ title }) {
  const user = await getDbUser();
  const resume = await prisma.resume.create({
    data: { userId: user.id, title: title || "Untitled Resume" },
  });
  revalidatePath("/resume");
  return { id: resume.id };
}

export async function getResumeById(resumeId) {
  const user = await getDbUser();
  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, userId: user.id },
  });
  if (!resume) throw new Error("Resume not found");
  return JSON.parse(JSON.stringify(resume));
}

export async function updateResume({ resumeId, data }) {
  const user = await getDbUser();
  const owned = await prisma.resume.findFirst({
    where: { id: resumeId, userId: user.id },
    select: { id: true },
  });
  if (!owned) throw new Error("Resume not found");
  await prisma.resume.update({
    where: { id: resumeId },
    data: {
      title: data.title,
      template: data.template,
      ascentColor: data.ascentColor,
      fontScale: data.fontScale ?? 1.0,
      professionalSummary: data.professionalSummary,
      skills: data.skills ?? [],
      // Store font inside personalInfo JSON (no dedicated column in schema)
      personalInfo: { ...(data.personalInfo ?? {}), _font: data.font ?? "inter" },
      experience: data.experience ?? [],
      projects: data.projects ?? [],
      education: data.education ?? [],
      sectionOrder: data.sectionOrder ?? [],
      customSections: data.customSections ?? [],
    },
  });
  revalidatePath("/resume");
  revalidatePath(`/resume/builder/${resumeId}`);
  return { ok: true };
}

export async function deleteResume(resumeId) {
  const user = await getDbUser();
  await prisma.resume.deleteMany({ where: { id: resumeId, userId: user.id } });
  revalidatePath("/resume");
  return { ok: true };
}

export async function renameResume({ resumeId, title }) {
  const user = await getDbUser();
  await prisma.resume.updateMany({
    where: { id: resumeId, userId: user.id },
    data: { title },
  });
  revalidatePath("/resume");
  return { ok: true };
}

// ─── AI Enhance actions ───────────────────────────────────────────────────────

export async function enhanceSummary(text) {
  if (!text?.trim()) throw new Error("No text provided");
  const ai = getFlashLite();
  const res = await ai.chat.completions.create({
    model: "gemini-3.1-flash-lite",
    messages: [
      {
        role: "system",
        content:
          "You are an expert in resume writing. Enhance the professional summary of a resume. The summary should be one to two statements highlighting key skills, experience, and career objectives. Make it compelling and ATS-friendly. Return only the enhanced text, no options, no commentary, no Markdown.",
      },
      { role: "user", content: text },
    ],
  });
  const enhanced = res.choices[0]?.message?.content?.trim() ?? "";
  if (!enhanced) throw new Error("AI returned an empty response");
  return { enhancedContent: enhanced };
}

export async function enhanceJobDescription({ description, position, company }) {
  if (!description?.trim()) throw new Error("No description provided");
  const ai = getFlashLite();
  const res = await ai.chat.completions.create({
    model: "gemini-3.1-flash-lite",
    messages: [
      {
        role: "system",
        content:
          "You are an expert resume writer. Rewrite the following job description as 1-2 concise, ATS-friendly sentences using strong action verbs and quantifiable results where possible. Return only the rewritten text, no bullets, no commentary, no Markdown.",
      },
      {
        role: "user",
        content: `Position: ${position ?? ""}\nCompany: ${company ?? ""}\nDescription: ${description}`,
      },
    ],
  });
  const enhanced = res.choices[0]?.message?.content?.trim() ?? "";
  if (!enhanced) throw new Error("AI returned an empty response");
  return { enhancedContent: enhanced };
}

export async function enhanceProjectDescription({ description, name, type }) {
  if (!description?.trim()) throw new Error("No description provided");
  const ai = getFlashLite();
  const res = await ai.chat.completions.create({
    model: "gemini-3.1-flash-lite",
    messages: [
      {
        role: "system",
        content:
          "You are an expert ATS resume writer. Rewrite the project description into 2-3 concise resume bullets, each beginning with '●'. Make it look like a strong Projects section: action verb first, clear product scope, relevant technical keywords, architecture/tools, outcomes, and measurable impact when the user provided enough detail. Do not invent numbers, employers, awards, or technologies not provided. Return only the bullets, no commentary, no Markdown.",
      },
      {
        role: "user",
        content: `Project name: ${name ?? ""}\nProject type: ${type ?? ""}\nDescription: ${description}`,
      },
    ],
  });
  const enhanced = res.choices[0]?.message?.content?.trim() ?? "";
  if (!enhanced) throw new Error("AI returned an empty response");
  return { enhancedContent: enhanced };
}

export async function enhanceCustomEntry({ sectionName, title, subtitle, description }) {
  if (!description?.trim()) throw new Error("No description provided");
  const ai = getFlashLite();
  const res = await ai.chat.completions.create({
    model: "gemini-3.1-flash-lite",
    messages: [
      {
        role: "system",
        content:
          `You are an expert ATS resume writer. The user has a custom resume section called "${sectionName ?? "Custom"}". ` +
          "Rewrite the provided description into 1-2 concise, impactful, ATS-friendly sentences. " +
          "Use strong action verbs and include measurable impact where possible. " +
          "Do not invent facts. Return only the enhanced text, no bullets, no commentary, no Markdown.",
      },
      {
        role: "user",
        content: `Title: ${title ?? ""}\nIssuer/Subtitle: ${subtitle ?? ""}\nDescription: ${description}`,
      },
    ],
  });
  const enhanced = res.choices[0]?.message?.content?.trim() ?? "";
  if (!enhanced) throw new Error("AI returned an empty response");
  return { enhancedContent: enhanced };
}

// ─── Import: Parse from pasted text ──────────────────────────────────────────

export async function parseResumeFromText({ title, resumeText }) {
  if (!resumeText?.trim()) throw new Error("No resume text provided");
  const user = await getDbUser();

  const ai = getFlashLite();
  const system = `Extract resume data from the provided text and return ONLY strict JSON matching exactly this shape (no extra fields, no markdown, no commentary):
{
  "professionalSummary": string,
  "skills": string[],
  "personalInfo": {
    "fullName": string, "profession": string, "email": string, "phone": string, "location": string,
    "links": [ { "label": string, "url": string } ]
  },
  "experience": [ { "company": string, "position": string, "startDate": string, "endDate": string, "description": string, "isCurrent": boolean } ],
  "projects": [ { "name": string, "type": string, "description": string } ],
  "education": [ { "institution": string, "degree": string, "field": string, "graduationDate": string, "gpa": string } ]
}

SKILLS RULES — critical:
- Group skills by category. Each element of "skills" must be ONE string in this exact format: "CategoryName: skill1, skill2, skill3"
- Common categories (use only relevant ones): Languages, Web & Frameworks, Databases, AI / ML, DevOps & Cloud, Tools, Core Concepts
- Do NOT list individual skills as separate array items. Always group.
- Example: ["Languages: Java, Python, C++", "Web & Frameworks: React, Next.js, Node.js", "Databases: MySQL, PostgreSQL"]

LINKS RULES:
- Put ALL social/professional links (LinkedIn, GitHub, Portfolio, website, etc.) in the "links" array as { "label": "LinkedIn", "url": "https://..." }
- Use empty array [] if no links found.

Use empty strings/arrays where information is not present. Return ONLY the JSON object.`;

  const res = await ai.chat.completions.create({
    model: "gemini-3.1-flash-lite",
    messages: [
      { role: "system", content: system },
      { role: "user", content: resumeText.slice(0, 20000) },
    ],
  });

  const content = res.choices[0]?.message?.content ?? "{}";
  let parsed = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = {};
  }

  const resume = await prisma.resume.create({
    data: {
      userId: user.id,
      title: title || "Imported Resume",
      professionalSummary: String(parsed.professionalSummary ?? ""),
      skills: parsed.skills ?? [],
      personalInfo: parsed.personalInfo ?? {},
      experience: parsed.experience ?? [],
      projects: parsed.projects ?? [],
      education: parsed.education ?? [],
    },
  });

  revalidatePath("/resume");
  return { resumeId: resume.id };
}

// ─── Import: Parse from PDF URL ───────────────────────────────────────────────

export async function parseResumeFromPdf({ title, pdfUrl }) {
  if (!pdfUrl) throw new Error("No PDF URL provided");
  const user = await getDbUser();

  // Fetch the PDF and convert to base64
  const response = await fetch(pdfUrl);
  if (!response.ok) throw new Error("Failed to fetch PDF");
  const pdfBuffer = await response.arrayBuffer();
  const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

  const extractPrompt = `Extract resume data from this PDF and return ONLY strict JSON matching exactly this shape (no extra fields, no markdown, no backticks):
{
  "professionalSummary": string,
  "skills": string[],
  "personalInfo": { "fullName": string, "profession": string, "email": string, "phone": string, "location": string, "link1Label": string, "link1Url": string, "link2Label": string, "link2Url": string },
  "experience": [ { "company": string, "position": string, "startDate": string, "endDate": string, "description": string, "isCurrent": boolean } ],
  "projects": [ { "name": string, "type": string, "description": string } ],
  "education": [ { "institution": string, "degree": string, "field": string, "graduationDate": string, "gpa": string } ]
}
For link1Label/link1Url use LinkedIn if found, link2Label/link2Url use GitHub/portfolio if found.
Use empty strings/arrays where information is not present.`;

  const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
          { text: extractPrompt },
        ],
      },
    ],
    generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
  });

  const text = result.response.text();
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  let parsed = {};
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = {};
  }

  const resume = await prisma.resume.create({
    data: {
      userId: user.id,
      title: title || parsed.personalInfo?.fullName
        ? `${parsed.personalInfo.fullName}'s Resume`
        : "Imported Resume",
      professionalSummary: String(parsed.professionalSummary ?? ""),
      skills: parsed.skills ?? [],
      personalInfo: parsed.personalInfo ?? {},
      experience: parsed.experience ?? [],
      projects: parsed.projects ?? [],
      education: parsed.education ?? [],
    },
  });

  revalidatePath("/resume");
  return { resumeId: resume.id };
}
