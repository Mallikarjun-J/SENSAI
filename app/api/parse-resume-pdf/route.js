import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const RESUME_LIMIT = 5;

const EXTRACT_PROMPT = `Extract resume data from this PDF and return ONLY strict JSON matching exactly this shape (no extra fields, no markdown, no backticks, no commentary):
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

SKILLS RULES — this is critical:
- Group skills by category. Each element of "skills" must be ONE string in this exact format: "CategoryName: skill1, skill2, skill3"
- Common categories (use only relevant ones, infer from context): Languages, Web & Frameworks, Databases, AI / ML, DevOps & Cloud, Tools, Core Concepts
- Do NOT put individual skills as separate array items. Always group them.
- Example: ["Languages: Java, Python, C++", "Web & Frameworks: React, Next.js, Node.js", "Databases: MySQL, PostgreSQL, MongoDB"]

LINKS RULES:
- Put ALL social/professional links (LinkedIn, GitHub, Portfolio, personal website, etc.) in the "links" array as { "label": "LinkedIn", "url": "https://..." }
- There is no limit — include every link you find in the resume.
- Use empty array [] if no links found.

OTHER RULES:
- Use empty strings/arrays where information is not present.
- Return ONLY the JSON object, nothing else.`;

export async function POST(request) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────────
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 401 });

    // ── Limit check ─────────────────────────────────────────────────────────────
    const count = await prisma.resume.count({ where: { userId: user.id } });
    if (count >= RESUME_LIMIT)
      return NextResponse.json(
        { error: `Resume limit reached (max ${RESUME_LIMIT})` },
        { status: 400 }
      );

    // ── Read file from FormData ──────────────────────────────────────────────────
    const formData = await request.formData();
    const file = formData.get("file");
    const title = (formData.get("title") || "").toString().trim();

    if (!file || !(file instanceof File))
      return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const pdfBase64 = Buffer.from(bytes).toString("base64");

    // ── Gemini extraction ────────────────────────────────────────────────────────
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
            { text: EXTRACT_PROMPT },
          ],
        },
      ],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
    });

    const raw = result.response.text();
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // Robust JSON extraction — find first { ... } block
    let parsed = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { parsed = {}; }
      }
    }

    // ── Create resume in DB ──────────────────────────────────────────────────────
    const resume = await prisma.resume.create({
      data: {
        userId: user.id,
        title: title || (parsed.personalInfo?.fullName
          ? `${parsed.personalInfo.fullName}'s Resume`
          : "Imported Resume"),
        professionalSummary: String(parsed.professionalSummary ?? ""),
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        personalInfo: parsed.personalInfo ?? {},
        experience: Array.isArray(parsed.experience) ? parsed.experience : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        education: Array.isArray(parsed.education) ? parsed.education : [],
      },
    });

    revalidatePath("/resume");
    return NextResponse.json({ resumeId: resume.id });
  } catch (err) {
    console.error("[parse-resume-pdf]", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to parse PDF" },
      { status: 500 }
    );
  }
}
