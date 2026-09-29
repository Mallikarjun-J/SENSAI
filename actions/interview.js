"use server"
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { feedbackSchema } from "@/constants/interview";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const googleAI = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const QUIZ_LIMIT = 7;
const VOICE_LIMIT = 7;

// ─── Existing Quiz Actions ─────────────────────────────────────────────────────

export async function generateQuiz(){
    const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.User.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");
    
  const prompt = `
    Generate 10 technical interview questions for a ${
      user.industry
    } professional${
    user.skills?.length ? ` with expertise in ${user.skills.join(", ")}` : ""
  }.
    
    Each question should be multiple choice with 4 options.
    
    Return the response in this JSON format only, no additional text:
    {
      "questions": [
        {
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correctAnswer": "string",
          "explanation": "string"
        }
      ]
    }
  `;

    try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    const quiz = JSON.parse(cleanedText);

    return quiz.questions;
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw new Error("Failed to generate quiz questions");
  }
}

export async function saveQuizResult(questions, answers, score){
    const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  // Enforce quiz limit
  const quizCount = await prisma.assessment.count({ where: { userId: user.id } });
  if (quizCount >= QUIZ_LIMIT) {
    throw new Error(`LIMIT_REACHED: You can only save up to ${QUIZ_LIMIT} quizzes. Delete an old one to save a new result.`);
  }

  const questionsResults = questions.map((q, index) => ({
    question: q.question,
    answer: q.correctAnswer,
    userAnswer: answers[index],
    isCorrect: q.correctAnswer === answers[index],
    explanation: q.explanation,
  }));

  const wrongAnswers = questionsResults.filter((q) => !q.isCorrect);
  let improvementTip = null;

  if(wrongAnswers.length > 0){
    const wrongQuestionsText = wrongAnswers
      .map(
        (q) =>
          `Question: "${q.question}"\nCorrect Answer: "${q.answer}"\nUser Answer: "${q.userAnswer}"`
      )
      .join("\n\n");

      const improvementPrompt = `
      The user got the following ${user.industry} technical interview questions wrong:

      ${wrongQuestionsText}

      Based on these mistakes, provide a concise, specific improvement tip.
      Focus on the knowledge gaps revealed by these wrong answers.
      Keep the response under 2 sentences and make it encouraging.
      Don't explicitly mention the mistakes, instead focus on what to learn/practice.
    `;

    try {
      const tipResult = await model.generateContent(improvementPrompt);
      improvementTip = tipResult.response.text().trim();
    } catch (error) {
      console.error("Error generating improvement tip:", error);
    }
  }

  try{
        const assessment = await prisma.assessment.create({
            data: {
                userId: user.id,
                quizScore: score,
                questions: questionsResults,
                category: "Technical",
                improvementTip,
            }
        }) 
        return assessment;
  }catch(error){
        console.error("Error saving quiz result:", error.code ?? "unknown");
        throw new Error("Failed to save quiz results");
  }
}

export async function getAssessments() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
      const assessments = await prisma.assessment.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" }
      });
      return assessments;
  } catch (error) {
    console.error("Error fetching assessment:", error.code ?? "unknown");
    throw new Error("Failed to Fetch the assessments");
  }
}

export async function deleteAssessment(assessmentId) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) throw new Error("User not found");

  await prisma.assessment.deleteMany({ where: { id: assessmentId, userId: user.id } });
  return { success: true };
}

export async function deleteVoiceInterview(interviewId) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!user) throw new Error("User not found");

  // VoiceFeedback cascades automatically
  await prisma.interview.deleteMany({ where: { id: interviewId, userId: user.id } });
  return { success: true };
}

// ─── Voice Interview Actions ───────────────────────────────────────────────────

/**
 * Generate interview questions via Gemini AI SDK (structured output).
 */
export async function generateVoiceInterviewQuestions({ role, level, type, techstack, amount }) {
  const techContext =
    techstack?.length > 0 ? `The candidate works with: ${techstack.join(", ")}.` : "";

  const typeGuide =
    type === "Technical"
      ? "Focus on technical depth: algorithms, system design, code quality, and technology-specific concepts."
      : type === "Behavioral"
      ? "Focus on soft skills: leadership, teamwork, conflict resolution, communication, and past experiences using the STAR method."
      : "Mix both technical questions (60%) and behavioral questions (40%).";

  const { object } = await generateObject({
    model: googleAI("gemini-2.5-flash"),
    schema: z.object({
      questions: z.array(z.string()).min(1).max(15).describe("List of interview questions"),
    }),
    prompt: `You are an expert interviewer. Generate exactly ${amount} high-quality interview questions for a ${level}-level ${role} position.

${techContext}

Interview Type: ${type}
${typeGuide}

Requirements:
- Questions should be clear, concise, and relevant to the role and level
- Vary the difficulty appropriately for a ${level} candidate
- Do NOT number the questions
- Do NOT include answers
- Return exactly ${amount} questions`,
    system:
      "You are an expert technical interviewer. Generate precise, relevant interview questions tailored to the role, level, and tech stack provided.",
  });

  return object.questions.slice(0, amount);
}

/**
 * Helper to convert a Prisma resume record into clean text for prompt context.
 */
function formatResumeToText(resume) {
  const parts = [];

  if (resume.title) parts.push(`Resume Title: ${resume.title}`);

  const pi = resume.personalInfo || {};
  if (pi.fullName || pi.profession) {
    parts.push(`Candidate: ${pi.fullName || ""} ${pi.profession ? `(${pi.profession})` : ""}`.trim());
  }

  if (resume.professionalSummary) {
    parts.push(`\n--- Professional Summary ---\n${resume.professionalSummary}`);
  }

  if (Array.isArray(resume.skills) && resume.skills.length > 0) {
    parts.push(`\n--- Skills ---\n${resume.skills.join("\n")}`);
  }

  if (Array.isArray(resume.experience) && resume.experience.length > 0) {
    const expText = resume.experience
      .map((e) => {
        const header = `${e.position || "Role"} at ${e.company || "Company"} (${e.startDate || ""} - ${e.isCurrent ? "Present" : e.endDate || ""})`;
        return `${header}\n${e.description || ""}`.trim();
      })
      .filter(Boolean)
      .join("\n\n");
    if (expText) parts.push(`\n--- Experience ---\n${expText}`);
  }

  if (Array.isArray(resume.projects) && resume.projects.length > 0) {
    const projText = resume.projects
      .map((p) => `${p.name || "Project"} (${p.type || "Project"})\n${p.description || ""}`.trim())
      .filter(Boolean)
      .join("\n\n");
    if (projText) parts.push(`\n--- Projects ---\n${projText}`);
  }

  if (Array.isArray(resume.education) && resume.education.length > 0) {
    const eduText = resume.education
      .map((ed) => `${ed.degree || ""} in ${ed.field || ""} - ${ed.institution || ""} (${ed.graduationDate || ""})`.trim())
      .filter(Boolean)
      .join("\n");
    if (eduText) parts.push(`\n--- Education ---\n${eduText}`);
  }

  return parts.join("\n");
}

/**
 * Generate interview questions based on the candidate's resume and a job description.
 */
export async function generateResumeJDInterviewQuestions({ resumeId, resumeText, jdText, level = "Mid", amount = 5 }) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!user) throw new Error("User not found");

  if (!jdText?.trim()) {
    throw new Error("Job description is required");
  }

  let finalResumeText = resumeText?.trim() || "";

  if (resumeId) {
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: user.id },
    });
    if (resume) {
      finalResumeText = formatResumeToText(resume);
    }
  }

  if (!finalResumeText) {
    throw new Error("Resume content is required. Please select or paste a resume.");
  }

  const { object } = await generateObject({
    model: googleAI("gemini-2.5-flash"),
    schema: z.object({
      role: z.string().describe("The target job title or role extracted from the job description"),
      techstack: z.array(z.string()).describe("Key technologies and skills required by the job description"),
      questions: z.array(z.string()).min(1).max(15).describe("List of tailored interview questions"),
    }),
    prompt: `You are an expert technical hiring manager and interviewer conducting a live voice interview for a ${level}-level candidate.

Analyze the candidate's resume and the job description provided below:

=== CANDIDATE RESUME ===
${finalResumeText.slice(0, 15000)}

=== JOB DESCRIPTION ===
${jdText.slice(0, 10000)}

Your Task:
1. Extract the primary Job Title / Role from the job description (e.g. "Senior Frontend Engineer", "DevOps Specialist", "Full Stack Developer").
2. Extract the key tech stack / primary skills (up to 8 items) required by the job description.
3. Generate exactly ${amount} interview questions tailored specifically to this candidate and this job opening:
   - Identify intersection points: probe the candidate's real experience on projects or roles on their resume that match JD requirements.
   - Probe skill gaps: if the JD requires key tools or skills that are absent or lightly mentioned in the resume, ask how they would handle or learn them.
   - Assess domain experience: ask scenario-based questions addressing the specific responsibilities in the job description.
   - Calibrate difficulty and expectations to a ${level}-level candidate.
   - Mix technical and behavioral questions naturally.

Requirements:
- Questions must be clear, concise, and natural for spoken voice conversation.
- Do NOT number the questions (no "1.", "2.", etc.).
- Do NOT include answers or hints.
- Return exactly ${amount} questions.`,
    system:
      "You are an expert technical interviewer. Generate precise, insightful interview questions by cross-referencing candidate resumes with job descriptions.",
  });

  return {
    role: object.role || "Software Professional",
    techstack: object.techstack || [],
    questions: object.questions.slice(0, amount),
  };
}

/**
 * Save a new voice interview session to the database.
 */
export async function createVoiceInterview({ role, level, type, techstack, questions, finalized = true }) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!user) throw new Error("User not found");

  // Enforce voice interview limit
  const voiceCount = await prisma.interview.count({ where: { userId: user.id } });
  if (voiceCount >= VOICE_LIMIT) {
    return { success: false, limitReached: true, limit: VOICE_LIMIT };
  }

  try {
    const interview = await prisma.interview.create({
      data: {
        userId: user.id,
        role,
        level,
        type,
        techstack: techstack ?? [],
        questions,
        finalized,
      },
    });
    return { success: true, interviewId: interview.id };
  } catch (error) {
    console.error("Error creating voice interview:", error);
    return { success: false };
  }
}

/**
 * Fetch a single voice interview by its ID.
 * Only returns the interview if it belongs to the currently authenticated user.
 */
export async function getVoiceInterviewById(id) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return null;

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });
    if (!user) return null;

    // Scope query to the authenticated user — prevents IDOR
    const interview = await prisma.interview.findFirst({
      where: { id, userId: user.id },
    });
    if (!interview) return null;
    return { ...interview, createdAt: interview.createdAt.toISOString() };
  } catch (error) {
    console.error("Error fetching voice interview:", error.code ?? "unknown");
    return null;
  }
}

/**
 * Fetch all voice interviews for the currently authenticated user.
 */
export async function getVoiceInterviewsByUserId() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!user) throw new Error("User not found");

  try {
    const interviews = await prisma.interview.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return interviews.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() }));
  } catch (error) {
    console.error("Error fetching voice interviews:", error);
    return [];
  }
}

/**
 * Score a transcript with Gemini and save as VoiceFeedback.
 */
export async function createVoiceFeedback({ interviewId, userId, transcript, feedbackId }) {
  try {
    const formattedTranscript = transcript
      .map((s) => `- ${s.role}: ${s.content}\n`)
      .join("");

    const { object } = await generateObject({
      model: googleAI("gemini-2.5-flash"),
      schema: feedbackSchema,
      prompt: `
        You are a senior technical recruiter and career coach conducting a rigorous evaluation of a mock interview.
        Read the full transcript carefully and produce a detailed, honest, and specific assessment.

        IMPORTANT STYLE RULE: Write ALL feedback in second person — use "you" and "your" throughout.
        Never use the candidate's name. Instead of "John did X", write "You did X".

        Transcript:
        ${formattedTranscript}

        Score the candidate from 0 to 100 in each area and write a DETAILED comment (minimum 4–6 sentences) for each.
        Your comments MUST:
        - Reference specific things the candidate actually said or did in the transcript (quote or paraphrase examples)
        - Explain WHY the score was given — what was strong and what fell short
        - Give concrete, actionable advice on how to improve
        - Be honest and critical — do NOT be overly positive if performance was weak

        Areas to evaluate:
        - **Communication Skills** (communicationScore / communicationComment): Assess how clearly the candidate articulated ideas, structured their answers, used (or avoided) filler words, and how easy it was to follow their reasoning.
        - **Technical Knowledge** (technicalScore / technicalComment): Evaluate depth of technical understanding, accuracy of concepts explained, ability to go beyond surface-level answers, and whether they connected knowledge to real scenarios.
        - **Problem Solving** (problemSolvingScore / problemSolvingComment): Examine how the candidate approached ambiguous or complex questions — did they break problems down, consider trade-offs, show logical thinking, and arrive at sound conclusions?
        - **Cultural & Role Fit** (culturalFitScore / culturalFitComment): Assess how well the candidate demonstrated alignment with the role's requirements, enthusiasm for the domain, awareness of team dynamics, and whether their motivations matched the opportunity.
        - **Confidence & Clarity** (confidenceScore / confidenceComment): Evaluate the candidate's self-assurance, poise when faced with difficult questions, clarity of delivery, and how their confidence level evolved through the session.


        For each of the 5 categories above, you must ALSO produce:
        - **improvements** (2–3 items): specific areas to improve within that category.
        - **strengths** (1–3 items): specific things done well within that category.

        Each bullet item must have:
        - "title": a short bold label (5–8 words, imperative or noun phrase), e.g. "Go deeper on trade-offs" or "Clear middleware explanation"
        - "detail": a paragraph (3–5 sentences) that references what the candidate actually said, explains why it matters, and gives a concrete action to take
        - "seenIn": which question number(s) this relates to, e.g. "Question 3" or "Question 3, Question 8" — reference the numbered transcript exchanges

        Rules for bullets:
        - Title must be distinct and specific — not a repeat of the category name
        - Detail must cite what was actually said (paraphrase, do not invent)
        - Do NOT copy-paste from the category comment — this is a different angle
        - Write in second person ("You explained...", "You should...")

        For strengths (global): List 4–5 standout strengths separated by ||| — short, skill-labelled, second person.
        For areasForImprovement (global): List 4–5 improvement areas separated by ||| — short, skill-labelled, second person.
        For finalAssessment: 3–5 sentences. Second person only.

        Be thorough. Vague or generic points are not acceptable.
      `,
      system:
        "You are a rigorous senior technical recruiter. Your feedback is specific, evidence-based, actionable, and honest. You always cite examples from the transcript. You do not give inflated scores or empty praise.",
    });

    const categoryScores = [
      {
        name: "Communication Skills", score: object.communicationScore, comment: object.communicationComment,
        improvements: object.communicationImprovements ?? [],
        strengths:    object.communicationStrengths    ?? [],
      },
      {
        name: "Technical Knowledge", score: object.technicalScore, comment: object.technicalComment,
        improvements: object.technicalImprovements ?? [],
        strengths:    object.technicalStrengths    ?? [],
      },
      {
        name: "Problem Solving", score: object.problemSolvingScore, comment: object.problemSolvingComment,
        improvements: object.problemSolvingImprovements ?? [],
        strengths:    object.problemSolvingStrengths    ?? [],
      },
      {
        name: "Cultural & Role Fit", score: object.culturalFitScore, comment: object.culturalFitComment,
        improvements: object.culturalFitImprovements ?? [],
        strengths:    object.culturalFitStrengths    ?? [],
      },
      {
        name: "Confidence & Clarity", score: object.confidenceScore, comment: object.confidenceComment,
        improvements: object.confidenceImprovements ?? [],
        strengths:    object.confidenceStrengths    ?? [],
      },
    ];

    const feedbackData = {
      interviewId,
      userId,
      totalScore: object.totalScore,
      categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
    };

    let resultId;
    if (feedbackId) {
      await prisma.voiceFeedback.update({ where: { id: feedbackId }, data: feedbackData });
      resultId = feedbackId;
    } else {
      const inserted = await prisma.voiceFeedback.create({ data: feedbackData });
      resultId = inserted.id;
    }

    return { success: true, feedbackId: resultId };
  } catch (error) {
    console.error("Error saving voice feedback:", error);
    return { success: false };
  }
}

/**
 * Fetch voice feedback for a specific interview + user combination.
 */
export async function getVoiceFeedbackByInterviewId({ interviewId, userId }) {
  try {
    const feedback = await prisma.voiceFeedback.findFirst({
      where: { interviewId, userId },
    });
    if (!feedback) return null;
    return { ...feedback, categoryScores: feedback.categoryScores, createdAt: feedback.createdAt.toISOString() };
  } catch (error) {
    console.error("Error fetching voice feedback:", error);
    return null;
  }
}

/**
 * Fetch all VoiceFeedback records for the current user (for stats + chart).
 */
export async function getVoiceFeedbacksForUser() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!user) throw new Error("User not found");

  try {
    const feedbacks = await prisma.voiceFeedback.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        totalScore: true,
        createdAt: true,
        categoryScores: true,
      },
    });
    return feedbacks.map((f) => ({
      ...f,
      createdAt: f.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error("Error fetching voice feedbacks:", error);
    return [];
  }
}