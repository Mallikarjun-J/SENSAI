import { GoogleGenAI } from "@google/genai";
import { cachedAICall, makeCacheKey } from "./ai-cache";
import { AI_CONFIG } from "./ai-config";

function getGenAI() {
  return new GoogleGenAI({ apiKey: AI_CONFIG.resumeAnalysis.apiKey });
}

// ─── Shared JSON schema (reused in both PDF and text prompts) ─────────────────

const JSON_SCHEMA = `{
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

// ─── PDF Prompt ───────────────────────────────────────────────────────────────

function buildPrompt({ jobTitle, jobDescription }) {
  return `You are a senior technical recruiter with 10+ years of experience at competitive tech companies. You have screened thousands of resumes and you know exactly what gets a candidate shortlisted — and what gets them silently rejected in under 10 seconds.

Your task: Conduct a rigorous, unbiased evaluation of the attached resume PDF against the role below. Your feedback will directly shape how this candidate improves their materials. Prioritize accuracy over encouragement — inflated scores create false confidence and hurt careers.

Job Context:
- Job Title: ${jobTitle}
- Job Description: ${jobDescription || "Not provided — evaluate the resume against professional market standards for the stated role."}

How to evaluate each dimension (think like a hiring manager making a real shortlist decision):

ATS Compliance:
Would this resume survive automated parsing before a human ever sees it? Check: exact keyword alignment with the job description, absence of headers/tables/graphics that break parsers, clean formatting that ATS engines can extract reliably. Missing role-specific keywords are an automatic rejection at most companies — they never even reach a human reviewer.

Tone & Style:
Is the language authoritative, professional, and results-oriented? Hiring managers read hundreds of resumes — passive phrasing ("responsible for", "worked on", "helped with") blends into the background and signals a lack of ownership. Active verbs, consistent formatting, and zero grammatical issues are baseline expectations, not differentiators.

Content Quality:
Do the bullet points communicate real business impact with measurable outcomes, or are they vague task lists? A resume without quantified achievements (numbers, percentages, scale, timeframes) gives hiring managers nothing to anchor a hiring decision on. Candidates competing for the same role with stronger content will always win. Bullet quality is the single biggest factor after keyword matching.

Structure & Readability:
Is the most important information visible within the first 6 seconds of scanning? Recruiters scan in an F-pattern — a poorly structured resume fails the first filter regardless of underlying qualifications. Section ordering, white space, and visual hierarchy all affect whether a resume gets read or set aside.

Skills Alignment:
Does the skills section map precisely to what the job description requires — using the same terminology? Generic skill lists padded with irrelevant technologies waste space and dilute signal. Missing required skills are an immediate disqualifier. Skills must match not just in concept but in vocabulary — ATS matches on exact strings.

Scoring Standards:
- Score honestly based on where this resume stands in a real competitive hiring pool.
- 40–55 = average (gets filtered out by ATS or in first human review at most top companies)
- 55–70 = serviceable but not competitive without improvements
- 70–85 = solid and will get interviews at most companies
- 85+ = genuinely strong resume requiring minimal changes
- Provide exactly 3–4 tips per category. "improve" tips must reference actual deficiencies in this specific resume — no generic advice.

Return ONLY a valid JSON object (no markdown, no backticks, no extra text):

${JSON_SCHEMA}`;
}

// ─── Main analysis function (PDF) ────────────────────────────────────────────

export async function analyzeResumeWithGemini({ pdfUrl, jobTitle, jobDescription }) {
  const cacheKey = makeCacheKey(
    "resume:pdf",
    pdfUrl,
    (jobTitle ?? "").toLowerCase().trim(),
    (jobDescription ?? "").trim()
  );

  return cachedAICall({
    key: cacheKey,
    ttl: 24 * 60 * 60, // 24 hours
    fn: async () => {
      // Fetch PDF from UploadThing CDN
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error("Failed to fetch PDF for analysis");

      const pdfBuffer = await response.arrayBuffer();
      const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

      const genAI = getGenAI();
      const result = await genAI.models.generateContent({
        model: AI_CONFIG.resumeAnalysis.model,
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

      const cleaned = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const parsed = JSON.parse(cleaned);

      const required = ["overallScore", "ATS", "toneAndStyle", "content", "structure", "skills"];
      for (const key of required) {
        if (!(key in parsed)) throw new Error(`Missing field in Gemini response: ${key}`);
      }

      return parsed;
    },
  });
}


// ─── Text Prompt (Resume Builder resumes) ────────────────────────────────────

function buildTextPrompt({ jobTitle, jobDescription }) {
  return `You are a senior technical recruiter with 10+ years of experience at competitive tech companies. You have screened thousands of resumes and you know exactly what gets a candidate shortlisted — and what gets them silently rejected in under 10 seconds.

Your task: Conduct a rigorous, unbiased evaluation of the resume text below against the target role. Your feedback will directly shape how this candidate improves their materials. Prioritize accuracy over encouragement — inflated scores create false confidence and hurt careers.

Job Context:
- Job Title: ${jobTitle}
- Job Description: ${jobDescription || "Not provided — evaluate the resume against professional market standards for the stated role."}

How to evaluate each dimension (think like a hiring manager making a real shortlist decision):

ATS Compliance:
Would this resume survive automated parsing before a human ever sees it? Check: exact keyword alignment with the job description, clean formatting that ATS engines can extract reliably. Missing role-specific keywords are an automatic rejection at most companies — they never even reach a human reviewer.

Tone & Style:
Is the language authoritative, professional, and results-oriented? Passive phrasing ("responsible for", "worked on", "helped with") signals a lack of ownership. Active verbs, consistent tense, and zero grammatical issues are baseline expectations, not differentiators.

Content Quality:
Do the bullet points communicate real business impact with measurable outcomes, or are they vague task lists? A resume without quantified achievements (numbers, percentages, scale, timeframes) gives hiring managers nothing to anchor a decision on. Bullet quality is the single biggest differentiator after keyword matching.

Structure & Readability:
Is the most important information visible within the first 6 seconds of scanning? Section ordering, logical flow, and visual hierarchy determine whether a resume gets read or set aside.

Skills Alignment:
Does the skills section map precisely to what the job requires — using the same terminology? Generic or irrelevant skill lists dilute signal. Missing required skills are an immediate disqualifier.

Scoring Standards:
- Score honestly based on where this resume stands in a real competitive hiring pool.
- 40–55 = average (gets filtered at ATS or first human review at most top companies)
- 55–70 = serviceable but not competitive without improvements
- 70–85 = solid, will get interviews at most companies
- 85+ = genuinely strong, minimal changes needed
- Provide exactly 3–4 tips per category. "improve" tips must reference actual deficiencies in this specific resume — not generic advice.

Return ONLY a valid JSON object (no markdown, no backticks, no extra text):

${JSON_SCHEMA}

Resume content to analyze:
`;
}

export async function analyzeResumeWithGeminiText({ resumeText, jobTitle, jobDescription }) {
  const cacheKey = makeCacheKey(
    "resume:text",
    resumeText,
    (jobTitle ?? "").toLowerCase().trim(),
    (jobDescription ?? "").trim()
  );

  return cachedAICall({
    key: cacheKey,
    ttl: 6 * 60 * 60, // 6 hours (builder resumes update more often)
    fn: async () => {
      const prompt = buildTextPrompt({ jobTitle, jobDescription }) + resumeText;

      const genAI = getGenAI();
      const result = await genAI.models.generateContent({
        model: AI_CONFIG.resumeAnalysis.model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.0, maxOutputTokens: 4096 },
      });

      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty response from Gemini");

      const cleaned = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const parsed = JSON.parse(cleaned);

      const required = ["overallScore", "ATS", "toneAndStyle", "content", "structure", "skills"];
      for (const key of required) {
        if (!(key in parsed)) throw new Error(`Missing field in Gemini response: ${key}`);
      }

      return parsed;
    },
  });
}
