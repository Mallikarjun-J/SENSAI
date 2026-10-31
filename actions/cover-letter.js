"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { AI_CONFIG } from "@/lib/ai-config";

function getCoverLetterModel() {
  const { apiKey, model } = AI_CONFIG.coverLetter;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model });
}

function extractUserContactDetails(user) {
  const latestResume = user?.resumes?.[0] ?? null;
  const personalInfo =
    latestResume?.personalInfo && typeof latestResume.personalInfo === "object"
      ? latestResume.personalInfo
      : {};

  const name = personalInfo.fullName?.trim() || user?.name?.trim() || "";
  const email = personalInfo.email?.trim() || user?.email?.trim() || "";
  const phone = personalInfo.phone?.trim() || "";

  let link = "";
  if (Array.isArray(personalInfo.links) && personalInfo.links.length > 0) {
    const linkedIn = personalInfo.links.find(
      (l) =>
        l.url?.toLowerCase().includes("linkedin") ||
        l.label?.toLowerCase().includes("linkedin")
    );
    const portfolio = personalInfo.links.find(
      (l) =>
        l.url?.toLowerCase().includes("github") ||
        l.label?.toLowerCase().includes("portfolio") ||
        l.label?.toLowerCase().includes("website")
    );
    link = linkedIn?.url || portfolio?.url || personalInfo.links[0]?.url || "";
  } else if (personalInfo.link1Url?.trim()) {
    link = personalInfo.link1Url.trim();
  }

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return {
    candidateName: name || "[Your Name]",
    candidateEmail: email || "[Your Email]",
    candidatePhone: phone || "[Your Phone Number]",
    candidateLink: link || "[Your LinkedIn Profile/Portfolio URL]",
    currentDate,
    hasRealName: Boolean(name),
    hasRealEmail: Boolean(email),
    hasRealPhone: Boolean(phone),
    hasRealLink: Boolean(link),
  };
}

export async function getUserContactInfo() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      resumes: {
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!user) return null;
  return extractUserContactDetails(user);
}

export async function generateCoverLetter(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      resumes: {
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!user) throw new Error("User not found");

  const {
    candidateName,
    candidateEmail,
    candidatePhone,
    candidateLink,
    currentDate,
  } = extractUserContactDetails(user);

  const latestResume = user.resumes?.[0] ?? null;

  // Extract experience & project highlights from resume for better grounding
  const expHighlights =
    Array.isArray(latestResume?.experience) && latestResume.experience.length > 0
      ? latestResume.experience
          .slice(0, 3)
          .map((e) => `- ${e.position} at ${e.company}: ${(e.description || "").slice(0, 140)}`)
          .join("\n")
      : "";

  const projHighlights =
    Array.isArray(latestResume?.projects) && latestResume.projects.length > 0
      ? latestResume.projects
          .slice(0, 3)
          .map((p) => `- ${p.name}: ${(p.description || "").slice(0, 140)}`)
          .join("\n")
      : "";

  const prompt = `
    You are an experienced career consultant who has helped hundreds of professionals land roles at competitive companies. You write cover letters that are direct, targeted, and grounded in the candidate's real background — not generic templates padded with enthusiasm.

    Write a professional cover letter for a ${data.jobTitle} position at ${data.companyName}.

    Candidate Profile:
    - Name: ${candidateName}
    - Phone: ${candidatePhone}
    - Email: ${candidateEmail}
    - Portfolio / LinkedIn: ${candidateLink}
    - Current Date: ${currentDate}
    - Industry: ${user.industry || "Technology"}
    - Years of Experience: ${user.experience || 0}
    - Skills: ${user.skills?.join(", ") || ""}
    - Professional Background: ${user.bio || ""}
${expHighlights ? `    - Work Experience Highlights:\n${expHighlights}\n` : ""}${projHighlights ? `    - Key Projects Highlights:\n${projHighlights}\n` : ""}

    Job Description:
    ${data.jobDescription}

    Header & Layout Instructions:
    Format the header in clean markdown with proper business letter structure at the top:
    ${candidateName}
    ${candidatePhone}
    ${candidateEmail}
    ${candidateLink}

    ${currentDate}

    Hiring Manager
    ${data.companyName}
    [Office Location/City, State]

    **Re: ${data.jobTitle} Application**

    Formatting rules:
    1. If a candidate contact field above has an actual value (e.g. real name, real email, real phone, real URL), USE THAT ACTUAL VALUE.
    2. If a candidate contact field has a placeholder (like "[Your Phone Number]" or "[Your LinkedIn Profile/Portfolio URL]"), KEEP THAT EXACT PLACEHOLDER so the candidate can fill it in. Do NOT invent fake phone numbers or emails.
    3. Use "${currentDate}" for the date.
    4. Sign off cleanly at the bottom with:
       Sincerely,

       ${candidateName}

    Writing Standards (these are non-negotiable):
    1. Open with a strong, specific first sentence that immediately establishes relevance — not a generic "I am excited to apply" opener. Hiring managers read dozens of letters; yours must earn their attention in one sentence.
    2. Demonstrate genuine understanding of what the role requires — reference specific responsibilities or requirements from the job description, not just the company name.
    3. Connect the candidate's real experience and skills to the role's actual needs — be precise, not vague. Specific > general, always.
    4. Include at least one concrete achievement with measurable impact if the candidate's background supports it. Numbers, scale, and outcomes carry far more weight than adjectives.
    5. Keep it under 400 words. Hiring managers do not read long cover letters — trim ruthlessly.
    6. Tone: Professional, confident, and direct. Not desperate, not over-enthusiastic. Write as someone who is qualified and knows it.
    7. Close with a clear, action-oriented statement — not a passive "I hope to hear from you."
  `;

  try {
    const result = await getCoverLetterModel().generateContent(prompt);
    let content = result.response.text().trim();

    // Deterministic post-processing: replace placeholders if real user data is available
    if (candidateName && candidateName !== "[Your Name]") {
      content = content.replace(/\[(?:Your Name|Candidate Name|Full Name|Name)\]/gi, candidateName);
    }
    if (candidateEmail && candidateEmail !== "[Your Email]") {
      content = content.replace(/\[(?:Your Email|Candidate Email|Email Address|Email)\]/gi, candidateEmail);
    }
    if (candidatePhone && candidatePhone !== "[Your Phone Number]") {
      content = content.replace(/\[(?:Your Phone Number|Your Phone|Candidate Phone|Phone Number|Phone)\]/gi, candidatePhone);
    }
    if (candidateLink && candidateLink !== "[Your LinkedIn Profile/Portfolio URL]") {
      content = content.replace(
        /\[(?:Your LinkedIn Profile\/Portfolio URL|Your LinkedIn Profile|Your Portfolio URL|LinkedIn Profile|Portfolio URL|LinkedIn\/Portfolio URL|Your Portfolio\/LinkedIn URL)\]/gi,
        candidateLink
      );
    }
    // Replace date placeholder with currentDate
    content = content.replace(/\[(?:Date|Today's Date|Current Date)\]/gi, currentDate);

    const coverLetter = await prisma.coverLetter.create({
      data: {
        content,
        jobDescription: data.jobDescription,
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        status: "completed",
        userId: user.id,
      },
    });

    return coverLetter;
  } catch (error) {
    console.error("Error generating cover letter:", error.message);
    throw new Error("Failed to generate cover letter");
  }
}

export async function getCoverLetters() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await prisma.coverLetter.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getCoverLetter(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await prisma.coverLetter.findUnique({
    where: {
      id,
      userId: user.id,
    },
  });
}

export async function updateCoverLetter(id, content) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await prisma.coverLetter.update({
    where: {
      id,
      userId: user.id,
    },
    data: {
      content,
    },
  });
}

export async function deleteCoverLetter(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await prisma.coverLetter.delete({
    where: {
      id,
      userId: user.id,
    },
  });
}
