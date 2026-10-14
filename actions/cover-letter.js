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

export async function generateCoverLetter(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
    You are an experienced career consultant who has helped hundreds of professionals land roles at competitive companies. You write cover letters that are direct, targeted, and grounded in the candidate's real background — not generic templates padded with enthusiasm.

    Write a professional cover letter for a ${data.jobTitle} position at ${data.companyName}.

    Candidate Profile:
    - Industry: ${user.industry}
    - Years of Experience: ${user.experience}
    - Skills: ${user.skills?.join(", ")}
    - Professional Background: ${user.bio}

    Job Description:
    ${data.jobDescription}

    Writing Standards (these are non-negotiable):
    1. Open with a strong, specific first sentence that immediately establishes relevance — not a generic "I am excited to apply" opener. Hiring managers read dozens of letters; yours must earn their attention in one sentence.
    2. Demonstrate genuine understanding of what the role requires — reference specific responsibilities or requirements from the job description, not just the company name.
    3. Connect the candidate's real experience and skills to the role's actual needs — be precise, not vague. Specific > general, always.
    4. Include at least one concrete achievement with measurable impact if the candidate's background supports it. Numbers, scale, and outcomes carry far more weight than adjectives.
    5. Keep it under 400 words. Hiring managers do not read long cover letters — trim ruthlessly.
    6. Tone: Professional, confident, and direct. Not desperate, not over-enthusiastic. Write as someone who is qualified and knows it.
    7. Close with a clear, action-oriented statement — not a passive "I hope to hear from you."

    Format the letter in clean markdown with proper business letter structure.
  `;


  try {
    const result = await getCoverLetterModel().generateContent(prompt);
    const content = result.response.text().trim();

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