"use server"
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { feedbackSchema } from "@/constants/interview";
import { cachedQuery, invalidateCache, cacheKeys } from "@/lib/db-cache";
import { formatPlainText } from "@/lib/utils";

import { AI_CONFIG } from "@/lib/ai-config";

function getInterviewModel() {
  const { apiKey, model } = AI_CONFIG.interview;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model });
}

function getInterviewSdkModel() {
  const { apiKey, model } = AI_CONFIG.interview;
  const googleAI = createGoogleGenerativeAI({ apiKey });
  return googleAI(model);
}

// ─── Existing Quiz Actions ─────────────────────────────────────────────────────

export async function generateQuiz({
  topic = "",
  difficulty = "Medium",
  type = "Mixed",
  topics = [],
  questionCount = 10,
} = {}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.User.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  // Fall back to user's industry if no topic specified
  const resolvedTopic = topic.trim() || user.industry || "General Software Development";
  const topicsLine = topics.length > 0
    ? `Focus specifically on these sub-topics: ${topics.join(", ")}.`
    : "";

  const typeInstruction =
    type === "Technical"
      ? "All questions should be technical — testing code knowledge, algorithms, system design, or tool-specific details."
      : type === "Conceptual"
      ? "All questions should be conceptual — testing understanding of principles, theory, and how things work."
      : "Mix technical and conceptual questions roughly 50/50.";

  const difficultyInstruction =
    difficulty === "Easy"
      ? "Questions should be beginner-friendly and straightforward."
      : difficulty === "Hard"
      ? "Questions should be challenging and require deep expertise."
      : "Questions should be moderate — suitable for someone with working experience.";

  const prompt = `You are a senior engineer at a competitive tech company designing a screening quiz for a ${resolvedTopic} position. Your questions should reliably distinguish candidates who genuinely understand the subject from those who have only memorized surface-level facts, No Markdown.

${typeInstruction}
${difficultyInstruction}
${topicsLine}

Generate ${questionCount} multiple-choice questions.

Question Standards:
- Each question must test understanding, not just recall. Questions that a candidate could answer by memorizing a definition without truly understanding the concept are poor questions.
- Write options that include plausible wrong answers — common misconceptions, edge case confusions, or subtly incorrect variations. Obvious wrong answers make questions trivial.
- The explanation for the correct answer must state clearly WHY the other options are wrong, not just why the correct one is right. This teaches the candidate what they missed.
- Questions must be directly relevant to "${resolvedTopic}" — no tangential topics, no trivia.
- Each question must have exactly 4 options. Only one is correct.
- Do NOT repeat questions or rephrase the same concept twice.
- STRICT: Output ONLY plain text for question, options, and explanation. Never use markdown formatting (no asterisks **, no bullet points, no backticks).

Return ONLY this JSON (no markdown, no extra text):
{
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctAnswer": "string",
      "explanation": "string"
    }
  ]
}`;

  try {
    const result = await getInterviewModel().generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    const quiz = JSON.parse(cleanedText);
    return (quiz.questions || []).map((q) => ({
      question: formatPlainText(q.question),
      options: (q.options || []).map((opt) => formatPlainText(opt)),
      correctAnswer: formatPlainText(q.correctAnswer),
      explanation: formatPlainText(q.explanation),
    }));
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

      const improvementPrompt = `You are a senior technical interviewer reviewing candidate quiz results for a ${user.industry} position.
The candidate missed the following questions:

${wrongQuestionsText}

Task: Write a concise, actionable improvement recommendation summarizing the primary technical knowledge gaps and the specific concepts the candidate must study.

STRICT FORMATTING REQUIREMENTS:
- Return ONLY plain normal text.
- Do NOT use ANY markdown formatting (no bold **, no italics *, no headers #, no bullet points, no backticks).
- Synthesize the core pattern of weaknesses across all missed questions into 2–3 cohesive sentences. Do NOT break down the response question-by-question.
- Do NOT include any introductory preamble, greeting, or meta-commentary (e.g., do NOT write "Here are the tips", "Based on your answers", "Knowledge gap:").
- Start directly with the recommendation itself.`;

    try {
      const tipResult = await getInterviewModel().generateContent(improvementPrompt);
      const rawTip = tipResult.response.text().trim();
      improvementTip = formatPlainText(rawTip);
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
        // ── Invalidate cached assessment list so next page load is fresh ─────────
        await invalidateCache(cacheKeys.assessments(user.id));
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

  return cachedQuery({
    key: cacheKeys.assessments(user.id),
    ttl: 5 * 60, // 5 minutes
    fn: async () => {
      try {
        const assessments = await prisma.assessment.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
        });
        return assessments;
      } catch (error) {
        console.error("Error fetching assessment:", error.code ?? "unknown");
        throw new Error("Failed to Fetch the assessments");
      }
    },
  });
}

export async function deleteAssessment(assessmentId) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) throw new Error("User not found");

  await prisma.assessment.deleteMany({ where: { id: assessmentId, userId: user.id } });
  await invalidateCache(cacheKeys.assessments(user.id));
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
    model: getInterviewSdkModel(),
    schema: z.object({
      questions: z.array(z.string()).min(1).max(15).describe("List of interview questions"),
    }),
    prompt: `You are a hiring manager at a competitive tech company conducting a live interview for a ${level}-level ${role} position. Your goal is to assess whether this candidate is genuinely qualified — not to make them comfortable.

${techContext}

Interview Type: ${type}
${typeGuide}

Generate exactly ${amount} questions that will reveal whether this candidate has real depth or surface-level knowledge.

Standards:
- Questions must be direct and specific — vague questions produce vague answers that tell you nothing
- Calibrate precisely to ${level} level: a Junior question asked to a Senior signals poor preparation; a Senior question asked to a Junior is equally unhelpful
- Avoid questions with textbook answers — prefer questions where weak candidates reveal gaps and strong candidates demonstrate genuine understanding
- For technical questions: probe the "why" and "when" not just the "what" — anyone can memorize definitions
- For behavioral questions: ask about specific real situations, not hypotheticals — "Tell me about a time when..." surfaces real experience
- Do NOT number the questions
- Do NOT include answers or hints
- Return exactly ${amount} questions`,
    system:
      "You are an experienced technical hiring manager. Your questions are precise, role-appropriate, and designed to distinguish candidates with genuine expertise from those with surface-level familiarity. You ask questions that weak candidates cannot bluff through, No Markdown.",
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
    model: getInterviewSdkModel(),
    schema: z.object({
      role: z.string().describe("The target job title or role extracted from the job description"),
      techstack: z.array(z.string()).describe("Key technologies and skills required by the job description"),
      questions: z.array(z.string()).min(1).max(15).describe("List of tailored interview questions"),
    }),
    prompt: `You are a senior hiring manager who has reviewed this candidate's resume and the job description below. You are preparing for a live voice interview with this candidate. Your objective is to efficiently determine whether they are a genuine fit — or whether there are critical gaps that would disqualify them.

=== CANDIDATE RESUME ===
${finalResumeText.slice(0, 15000)}

=== JOB DESCRIPTION ===
${jdText.slice(0, 10000)}

Your Task:
1. Extract the primary Job Title / Role from the job description.
2. Extract the key tech stack / primary skills (up to 8 items) required by the job.
3. Generate exactly ${amount} interview questions that cut to what matters for this specific candidate and this specific role:
   - Probe experience intersections: where the candidate's resume claims experience the JD requires — verify depth, not just presence. Anyone can write keywords; few can answer follow-up questions.
   - Expose skill gaps: if the JD requires tools or skills that are absent or thin on the resume, ask directly how the candidate would handle that gap or how quickly they could close it.
   - Test scenario judgment: use the specific responsibilities from the JD to frame real-world situations — assess decision-making and prioritization, not recall.
   - Calibrate to ${level} level throughout.
   - Mix technical and behavioral questions naturally — use behavioral framing where the JD emphasizes team or leadership dimensions.

Requirements:
- Questions must be natural for spoken voice conversation — not academic or essay-style
- Each question should be answerable in 60–120 seconds by a strong candidate
- Do NOT number the questions
- Do NOT include answers or hints
- Return exactly ${amount} questions`,
    system:
      "You are a senior technical hiring manager conducting a structured interview. You cross-reference resumes with job descriptions to identify where candidates are strong, where they are thin, and where they may be overstating experience. Your questions are specific, direct, and designed to surface real competence.",
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
      model: getInterviewSdkModel(),
      schema: feedbackSchema,
      prompt: `
        You are a panel of three evaluators: a senior technical hiring manager, an experienced HR professional, and a principal engineer. You have just finished reviewing a mock interview transcript. Your goal is to produce an assessment that is honest, grounded in evidence from the transcript, and useful to the candidate — not to make them feel good.

        CRITICAL STYLE RULE: Write ALL feedback in second person — use "you" and "your" throughout. Never use the candidate's name.

        Transcript:
        ${formattedTranscript}

        Score the candidate from 0 to 100 in each area. These scores reflect how this candidate would likely perform in a real hiring decision at a competitive company:
        - 0–40: Would not pass screening — significant gaps that would disqualify in most processes
        - 41–60: Borderline — might pass at some companies but would not be competitive at strong teams
        - 61–75: Acceptable — would progress at many companies but needs specific improvements to stand out
        - 76–90: Strong — would be a competitive candidate at most companies
        - 91–100: Exceptional — rare performance that would impress even senior interviewers

        Write a DETAILED comment (minimum 4–6 sentences) for each area. Comments MUST:
        - Quote or closely paraphrase specific things actually said in the transcript — do not invent examples
        - Explain the hiring impact: how would this answer affect a real hiring decision?
        - Name the exact gap or strength — not generic categories
        - Give a concrete, actionable next step — what exactly should the candidate do differently next time?
        - Be proportionally critical: if performance was weak, the comment must reflect that clearly

        Areas to evaluate:

        Communication Skills (communicationScore / communicationComment):
        Did the candidate communicate ideas with clarity and structure? Were answers logically sequenced or scattered? Was the pace appropriate for a professional interview setting? Filler words, hedging, and incomplete sentences signal lack of preparation to interviewers — note these specifically if present.

        Technical Knowledge (technicalScore / technicalComment):
        Did the candidate demonstrate real technical depth, or surface-level familiarity? Could they go beyond definitions to explain trade-offs, edge cases, and real-world application? Interviewers at strong companies will probe further when an answer is shallow — assess whether this candidate could withstand that follow-up.

        Problem Solving (problemSolvingScore / problemSolvingComment):
        When faced with open-ended or complex questions, did the candidate structure their thinking, or jump to conclusions? Did they consider alternatives, trade-offs, and constraints? Problem-solving ability is one of the strongest signals of long-term performance — assess it rigorously.

        Cultural & Role Fit (culturalFitScore / culturalFitComment):
        Did the candidate demonstrate genuine understanding of what the role requires — not just technical skills but how the work gets done in a team? Did their examples reflect ownership, collaboration, and alignment with professional expectations? A mismatch here is a fast rejection even for technically strong candidates.

        Confidence & Clarity (confidenceScore / confidenceComment):
        Was the candidate poised when questions were difficult, or did they retreat, hedge, or trail off? Confidence is assessed not just by tone but by how directly and completely questions were answered. Experienced interviewers distinguish between genuine confidence and rehearsed bluster — assess which was present here.

        For each of the 5 categories, produce:
        - improvements (2–3 items): specific, named areas to fix within that category
        - strengths (1–3 items): specific things done well — only if genuinely demonstrated, not as padding

        Each bullet item must have:
        - "title": 5–8 words, imperative or noun phrase — e.g. "Quantify system design trade-offs" or "Structured STAR delivery"
        - "detail": 3–5 sentences — must cite what was actually said, explain why it matters in a hiring context, and give a specific action to take
        - "seenIn": which question(s) this relates to — e.g. "Question 3" or "Question 3, Question 8"

        Rules for bullets:
        - Title must be distinct from the category name — specific to what happened
        - Detail must reference the transcript — do not invent or generalize
        - Write in second person throughout
        - Do NOT copy-paste from the category comment

        For strengths (global): 4–5 standout positives separated by ||| — short, skill-labelled, second person. Only list genuine strengths — do not pad.
        For areasForImprovement (global): 4–5 gaps separated by ||| — short, named precisely, second person. These are the things a hiring manager would note as concerns.
        For finalAssessment: 3–5 sentences. Give an honest verdict — would this candidate likely pass a real interview at a competitive company at this level? What is the single most important thing to fix before the next interview?

        Accuracy matters more than encouragement here.
      `,
      system:
        "You are a rigorous hiring panel evaluating a mock interview. Your feedback is specific, transcript-grounded, and calibrated to real hiring standards. You do not inflate scores, soften criticism, or give empty praise. Every score and comment must reflect what an experienced recruiter or engineering manager would actually think.",
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