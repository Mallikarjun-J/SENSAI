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
        console.log("Erro saving quiz result:", error);
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
    console.log("Error fetching assessment:", error);
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
 */
export async function getVoiceInterviewById(id) {
  try {
    const interview = await prisma.interview.findUnique({ where: { id } });
    if (!interview) return null;
    return { ...interview, createdAt: interview.createdAt.toISOString() };
  } catch (error) {
    console.error("Error fetching voice interview:", error);
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
        You are an AI interviewer analyzing a mock interview. Evaluate the candidate based on structured categories. Be thorough and detailed. Don't be lenient — point out mistakes and areas for improvement.
        Transcript:
        ${formattedTranscript}

        Score the candidate from 0 to 100 in the following areas only:
        - **Communication Skills**: Clarity, articulation, structured responses.
        - **Technical Knowledge**: Understanding of key concepts for the role.
        - **Problem-Solving**: Ability to analyze problems and propose solutions.
        - **Cultural & Role Fit**: Alignment with company values and job role.
        - **Confidence & Clarity**: Confidence in responses, engagement, and clarity.
      `,
      system:
        "You are a professional interviewer analyzing a mock interview. Evaluate the candidate based on structured categories.",
    });

    const categoryScores = [
      { name: "Communication Skills", score: object.communicationScore, comment: object.communicationComment },
      { name: "Technical Knowledge", score: object.technicalScore, comment: object.technicalComment },
      { name: "Problem Solving", score: object.problemSolvingScore, comment: object.problemSolvingComment },
      { name: "Cultural & Role Fit", score: object.culturalFitScore, comment: object.culturalFitComment },
      { name: "Confidence & Clarity", score: object.confidenceScore, comment: object.confidenceComment },
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