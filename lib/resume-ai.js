import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.RESUME_ANALYSIS_KEY });

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt({ jobTitle, jobDescription }) {
  return `You are a world-class expert in ATS (Applicant Tracking System) optimization and professional resume analysis.

Your task: Thoroughly analyze the attached resume PDF and provide structured, actionable feedback.

Job Context:
- Job Title: ${jobTitle}
- Job Description: ${jobDescription || "Not provided — analyze the resume on its own merit."}

Instructions:
- Be thorough, honest, and detailed. Do not sugarcoat weak resumes.
- If the resume has many issues, give low scores to reflect reality.
- Score 0-100 for each category.
- Provide 3-4 specific, actionable tips per category.
- For ATS, focus on keyword matching, formatting, parsability.
- For Tone & Style, evaluate professionalism, active voice, consistency.
- For Content, evaluate impact, quantified achievements, relevance.
- For Structure, evaluate layout, section ordering, readability.
- For Skills, evaluate match with job requirements, organization, relevance.

Return ONLY a valid JSON object (no markdown, no backticks, no extra text) matching this exact structure:

{
  "overallScore": number,
  "ATS": {
    "score": number,
    "tips": [{ "type": "good" | "improve", "tip": string }]
  },
  "toneAndStyle": {
    "score": number,
    "tips": [{ "type": "good" | "improve", "tip": string, "explanation": string }]
  },
  "content": {
    "score": number,
    "tips": [{ "type": "good" | "improve", "tip": string, "explanation": string }]
  },
  "structure": {
    "score": number,
    "tips": [{ "type": "good" | "improve", "tip": string, "explanation": string }]
  },
  "skills": {
    "score": number,
    "tips": [{ "type": "good" | "improve", "tip": string, "explanation": string }]
  }
}`;
}

// ─── Main analysis function ───────────────────────────────────────────────────

export async function analyzeResumeWithGemini({ pdfUrl, jobTitle, jobDescription }) {
  // Fetch PDF from UploadThing CDN
  const response = await fetch(pdfUrl);
  if (!response.ok) throw new Error("Failed to fetch PDF for analysis");

  const pdfBuffer = await response.arrayBuffer();
  const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

  const result = await genAI.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: pdfBase64,
            },
          },
          {
            text: buildPrompt({ jobTitle, jobDescription }),
          },
        ],
      },
    ],
    config: {
      temperature: 0.0,
      maxOutputTokens: 4096,
    },
  });

  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini");

  // Strip markdown code fences if present
  const cleaned = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  const parsed = JSON.parse(cleaned);

  // Basic validation
  const required = ["overallScore", "ATS", "toneAndStyle", "content", "structure", "skills"];
  for (const key of required) {
    if (!(key in parsed)) throw new Error(`Missing field in Gemini response: ${key}`);
  }

  return parsed;
}
