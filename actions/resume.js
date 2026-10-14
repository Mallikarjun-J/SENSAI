"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

import { AI_CONFIG } from "@/lib/ai-config";

// ─── AI clients ──────────────────────────────────────────────────────────────

// Gemini via OpenAI-compat (for enhance/parse text actions)
function getResumeBuilderClient() {
  const { apiKey, model } = AI_CONFIG.resumeBuilder;
  const client = new OpenAI({
    apiKey,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  });
  return { client, model };
}

// Native Gemini client (for PDF parsing)
function getResumeParserModel() {
  const { apiKey, model } = AI_CONFIG.resumeBuilder;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model });
}

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
  const { client: ai, model } = getResumeBuilderClient();
  const res = await ai.chat.completions.create({
    model,
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
  const { client: ai, model } = getResumeBuilderClient();
  const res = await ai.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "You are an expert ATS resume writer. Analyze the target job description and the candidate's experience, skills, and achievements. Write a concise, impactful resume summary tailored to the target role, highlighting relevant technical skills, industry keywords, strengths, and measurable achievements where supported. Use strong language, avoid generic statements, and never invent skills, metrics, or accomplishments. Return only the bullets, each beginning with '●', no commentary or Markdown.",
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
  const { client: ai, model } = getResumeBuilderClient();
  const res = await ai.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "You are an expert ATS resume writer. Rewrite the project description into as many concise resume bullets as needed to create a strong, competitive Projects section. Prioritize meaningful technical contributions, architecture, tools, problem-solving, relevant ATS keywords, and measurable impact where supported by the provided details. Use strong action verbs, highlight engineering depth, avoid repetition, and never invent metrics, technologies, or achievements. Return only the bullets, each beginning with '●', no commentary or Markdown.",
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
  const { client: ai, model } = getResumeBuilderClient();
  const res = await ai.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          `You are an expert ATS resume writer. The user has a custom resume section called "${sectionName ?? "Custom"}". ` +
          "Rewrite the provided content into a concise, impactful, ATS-friendly resume section. " +
          "Use strong action verbs, relevant keywords, technical details, and measurable impact wherever supported by the provided information. " +
          "Adapt the length and format to the section, prioritizing meaningful content over quantity. Never invent facts, skills, metrics, or achievements. " +
          "Return only the enhanced text in the appropriate format, without commentary or unnecessary formatting, No Markdown.",
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

  const { client: ai, model } = getResumeBuilderClient();
  const system = `Extract structured resume data from the provided text and return ONLY valid JSON matching exactly this schema:
  {
    "professionalSummary": "",
    "skills": [],
    "personalInfo": {
      "fullName": "", "profession": "", "email": "", "phone": "", "location": "",
      "links": [{ "label": "", "url": "" }]
    },
    "experience": [
      { "company": "", "position": "", "startDate": "", "endDate": "", "description": "", "isCurrent": false }
    ],
    "projects": [
      { "name": "", "type": "", "description": "" }
    ],
    "education": [
      { "institution": "", "degree": "", "field": "", "graduationDate": "", "gpa": "" }
    ]
  }

  RULES:
  - Extract information accurately. Never invent, assume, or fabricate details.
  - Preserve the meaning of the original content while keeping descriptions clear and concise.
  - Use empty strings for missing values and empty arrays when no entries are found.
  - Return only the specified fields with the correct data types.

  SKILLS:
  - Group skills by category. Each array element must follow this format: "CategoryName: skill1, skill2, skill3".
  - Use only relevant categories: Languages, Web & Frameworks, Databases, AI / ML, DevOps & Cloud, Tools, Core Concepts.
  - Do not list individual skills as separate array elements.

  LINKS:
  - Include all available professional and social links, such as LinkedIn, GitHub, and Portfolio, as objects containing "label" and "url".
  - Use an empty array if no links are found.

  EXPERIENCE:
  - Set "isCurrent" to true only when the position is explicitly identified as current or ongoing.
  - Preserve dates as provided. Do not guess missing dates.

  OUTPUT:
  - Return ONLY the JSON object.
  - Ensure the output is valid, strictly formatted JSON with double-quoted keys and string values.
  - Do not include Markdown, comments, explanations, or additional fields.`;

  const res = await ai.chat.completions.create({
    model,
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

  const extractPrompt = `Extract resume data from the provided PDF and return ONLY valid JSON matching exactly this shape (no extra fields, no markdown, no backticks, no commentary):
  {
    "professionalSummary": string,
    "skills": string[],
    "personalInfo": { "fullName": string, "profession": string, "email": string, "phone": string, "location": string, "link1Label": string, "link1Url": string, "link2Label": string, "link2Url": string },
    "experience": [ { "company": string, "position": string, "startDate": string, "endDate": string, "description": string, "isCurrent": boolean } ],
    "projects": [ { "name": string, "type": string, "description": string } ],
    "education": [ { "institution": string, "degree": string, "field": string, "graduationDate": string, "gpa": string } ]
  }

  EXTRACTION RULES:
  - Extract information accurately from the PDF. Do not invent, assume, or fabricate details.
  - Preserve the original meaning of the resume content. Correctly identify and map information to the appropriate fields.
  - Keep descriptions concise while preserving meaningful responsibilities, technical contributions, achievements, and relevant details.
  - Preserve dates, names, qualifications, and metrics as provided. Do not calculate or guess missing values.
  - Set "isCurrent" to true only when the resume clearly indicates that the position is current or ongoing; otherwise, use false.
  - For "skills", return an array of strings containing the skills explicitly mentioned in the resume.
  - For "projects", extract each identifiable project separately, preserving its name, type, and description.
  - For "education", extract each identifiable qualification separately, preserving the institution, degree, field, graduation date, and GPA when available.

  LINK RULES:
  - Use "link1Label" and "link1Url" for LinkedIn when available.
  - Use "link2Label" and "link2Url" for GitHub or a portfolio when available.
  - Preserve the actual URLs found in the PDF. Do not construct, modify, or guess URLs.
  - If a link is not available, use an empty string for its label and URL.
  - If multiple links are present, prioritize LinkedIn for link 1 and GitHub or portfolio for link 2.

  MISSING INFORMATION:
  - Use empty strings for missing string values.
  - Use empty arrays when no entries are found for array fields.
  - Use false for "isCurrent" when a current position cannot be established.
  - Do not omit any fields, change their names, or introduce additional fields.

  OUTPUT REQUIREMENTS:
  - Return ONLY the JSON object matching the exact schema above.
  - Ensure the output is valid JSON, with double-quoted keys and string values.
  - Use the correct data types for all fields.
  - Do not include comments, explanations, or any text outside the JSON object.`;

  const model = getResumeParserModel();
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
