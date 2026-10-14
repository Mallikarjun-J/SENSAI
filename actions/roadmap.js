"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { roadmapGenerationLimiter, checkRateLimit } from "@/lib/rate-limit";
import { cachedQuery, invalidateCache, cacheKeys } from "@/lib/db-cache";

import { AI_CONFIG } from "@/lib/ai-config";

function getRoadmapModel() {
  const { apiKey, model } = AI_CONFIG.roadmap;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanAIResponse(text) {
  return text
    .replace(/```[\w]*\n?/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/#{1,6}\s/g, "")
    .replace(/^\s*[-•]\s*/gm, "")
    .trim();
}

function parsePhasesFromResponse(text) {
  const phases = [];
  const lines = text.split("\n").filter((l) => l.trim());
  let currentPhase = null;

  for (const line of lines) {
    const phaseMatch = line.match(/^(?:Phase|Day)\s+(\d+):\s*(.+)/i);
    if (phaseMatch) {
      if (currentPhase) phases.push(currentPhase);
      currentPhase = {
        number: parseInt(phaseMatch[1]),
        name: cleanAIResponse(phaseMatch[2].trim()),
        steps: [],
      };
      continue;
    }
    const stepMatch = line.match(/^\d+\.\d+\s+(.+)/);
    if (stepMatch && currentPhase) {
      const desc = cleanAIResponse(stepMatch[1].trim());
      currentPhase.steps.push({ title: desc.slice(0, 50), description: desc });
    }
  }
  if (currentPhase) phases.push(currentPhase);
  return phases;
}

async function getYouTubeVideos(query) {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await res.text();
    const videoIds = [...html.matchAll(/"videoId":"([^"]{11})"/g)]
      .map((m) => m[1])
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 2);
    return videoIds.map((id) => ({
      title: `${query} Tutorial`,
      url: `https://www.youtube.com/watch?v=${id}`,
      thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
    }));
  } catch {
    return [];
  }
}

function fallbackStepTopics(title, description, phaseName) {
  const cleanTitle = (title || "")
    .replace(/^(Learn|Master|Understand|Intro to|Introduction to|Getting started with|Build with)\s+/i, "")
    .trim();

  // If title has multiple items (e.g. "HTML, CSS & Flexbox" or "Docker / Kubernetes")
  const parts = cleanTitle
    .split(/[,/&|]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  if (parts.length >= 3) {
    return parts.slice(0, 4).map((p) => `Fundamentals & practical usage of ${p}`);
  }

  return [
    `Core principles & architecture of ${cleanTitle || phaseName}`,
    `Standard tooling, libraries & development workflows`,
    `Performance optimization, security & best practices`,
    `Real-world implementation patterns & debugging`,
  ];
}

async function generatePhaseKeyTopics(phaseName, steps) {
  try {
    const stepList = steps.map((s, i) => `${i + 1}. ${s.title}: ${s.description || s.title}`).join("\n");
    const result = await getRoadmapModel().generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are a Principal Engineer. For the roadmap phase "${phaseName}", provide 4 essential technical "Must Learn" key topics for each step below.
Focus on core architecture, trade-offs, practical tools, and interview-tested concepts.

Steps:
${stepList}

Return ONLY a JSON array of string arrays (one inner array per step with 4 strings):
[
  ["Topic 1", "Topic 2", "Topic 3", "Topic 4"],
  ["Topic 1", "Topic 2", "Topic 3", "Topic 4"]
]

No markdown formatting, no comments, no extra text.`,
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.2 },
    });

    const text = result.response.text().trim();
    const cleaned = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    const match = cleaned.match(/\[[\s\S]*\]/);

    if (match) {
      const parsed = JSON.parse(match[0]);
      let extracted = [];

      if (Array.isArray(parsed)) {
        extracted = parsed.map((item) => {
          if (Array.isArray(item)) return item.map(String).filter(Boolean);
          if (item && typeof item === "object") {
            const sub = item.subtopics || item.topics || item.keyTopics || Object.values(item).find(Array.isArray);
            if (Array.isArray(sub)) return sub.map(String).filter(Boolean);
          }
          return [];
        });
      } else if (parsed && typeof parsed === "object") {
        const arr = parsed.steps || parsed.subtopics || parsed.topics || Object.values(parsed).find(Array.isArray);
        if (Array.isArray(arr)) {
          extracted = arr.map((item) => (Array.isArray(item) ? item.map(String).filter(Boolean) : []));
        }
      }

      return steps.map((s, i) => {
        const topics = extracted[i];
        if (Array.isArray(topics) && topics.length >= 3) {
          return topics.slice(0, 5);
        }
        return fallbackStepTopics(s.title, s.description, phaseName);
      });
    }
  } catch (err) {
    console.warn(`generatePhaseKeyTopics fallback triggered for "${phaseName}":`, err?.message || err);
  }

  return steps.map((s) => fallbackStepTopics(s.title, s.description, phaseName));
}

async function buildRoadmapNodes(phases, projectName) {
  const PHASE_SPACING = 600;
  const BRANCH_OFFSET = 380;
  const STEP_SPACING = 280;
  const CENTER_X = 0;
  const nodes = [];

  for (let pi = 0; pi < phases.length; pi++) {
    const phase = phases[pi];
    const phaseY = pi * PHASE_SPACING;
    const steps = phase.steps.slice(0, 4);
    while (steps.length < 4)
      steps.push({
        title: `Step ${steps.length + 1}`,
        description: `Complete step ${steps.length + 1} of ${phase.name}`,
      });

    const stepConnections = steps.map((_, si) => `step-${phase.number}-${si + 1}`);

    // Fetch key topics for all 4 steps in this phase
    const keyTopicsPerStep = await generatePhaseKeyTopics(phase.name, steps);

    nodes.push({
      id: `phase-${phase.number}`,
      title: phase.name,
      description: `Phase ${phase.number}: ${phase.name}`,
      x: CENTER_X,
      y: phaseY,
      level: pi,
      category: "career_roadmap",
      connections: stepConnections,
      isPhase: true,
      isStep: false,
      phaseNumber: phase.number,
      stepNumber: null,
      isLeft: false,
      keyTopics: steps.map((s) => s.title),
      resources: {
        aiSummary: `Phase ${phase.number} of your ${projectName} roadmap: ${phase.name}`,
        youtubeVideos: await getYouTubeVideos(`${phase.name} ${projectName}`),
        searchResults: [
          {
            title: `Learn ${phase.name}`,
            url: `https://google.com/search?q=${encodeURIComponent(`${phase.name} ${projectName} tutorial`)}`,
            description: `Search for ${phase.name} resources`,
          },
        ],
      },
    });

    for (let si = 0; si < steps.length; si++) {
      const step = steps[si];
      const isLeft = si < 2;
      const indexOnSide = si % 2;
      const stepX = CENTER_X + (isLeft ? -1 : 1) * BRANCH_OFFSET;
      const stepY = phaseY - STEP_SPACING * 0.75 + indexOnSide * STEP_SPACING;

      nodes.push({
        id: `step-${phase.number}-${si + 1}`,
        title: step.title,
        description: step.description,
        x: stepX,
        y: stepY,
        level: pi,
        category: "career_roadmap",
        connections: [],
        isPhase: false,
        isStep: true,
        phaseNumber: phase.number,
        stepNumber: si + 1,
        isLeft,
        keyTopics: keyTopicsPerStep[si] ?? [],
        resources: {
          aiSummary: `Step ${si + 1} of ${phase.name}: ${step.description}`,
          youtubeVideos: await getYouTubeVideos(`${step.title} tutorial`),
          searchResults: [
            {
              title: `How to: ${step.title}`,
              url: `https://google.com/search?q=${encodeURIComponent(`how to ${step.title}`)}`,
              description: `Learn more about ${step.title}`,
            },
          ],
        },
      });
    }
  }
  return nodes;
}

// ─── Auth Helper ──────────────────────────────────────────────────────────────

async function getDbUser() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");
  const user = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!user) throw new Error("User not found");
  return user;
}

// ─── Public Actions ───────────────────────────────────────────────────────────

/**
 * Generate roadmap phases + nodes via Gemini — no DB write.
 * Called from the API route so generation can stream/timeout properly.
 */
export async function generateRoadmap(career, { skills = [], experience = 0 } = {}) {
  // Use the career input directly as the title — no AI name generation
  // (AI was producing random phase names like "Continuous Delivery" instead of the actual career)
  const projectName = career
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const skillsLine =
    skills.length > 0
      ? `The candidate already knows: ${skills.slice(0, 10).join(", ")}. Build on these and focus on gaps.`
      : "";
  const expLine =
    experience > 0
      ? `The candidate has ${experience} year${experience === 1 ? "" : "s"} of experience. Skip absolute basics and pitch the roadmap at the right level.`
      : "The candidate is a beginner — start from fundamentals.";

  const phasesPrompt = `You are a Principal Engineer and Engineering Director who has designed onboarding curriculums and hiring bars at top tech companies.
Design an industry-calibrated, pragmatic career roadmap for becoming a professional ${career}.

${expLine}
${skillsLine}

Industry Standards:
- Reflect real-world production expectations, not outdated academic or generic tutorial topics.
- Prioritize technologies, frameworks, system design patterns, and engineering practices that companies actively screen for in technical interviews and job descriptions.
- Order phases progressively from foundational core to advanced production readiness and real-world project deployment.

CRITICAL FORMAT RULES:
- Exactly 4 to 6 phases in total.
- Each phase must have EXACTLY 4 steps.
- Each step must be a concise, specific technology, tool, architecture concept, or practical skill (under 50 characters).
- No markdown, no asterisks, no bullets, no commentary.

Format:
Phase 1: Foundation
1.1 [specific skill/tool to learn]
1.2 [specific skill/tool to learn]
1.3 [specific skill/tool to learn]
1.4 [specific skill/tool to learn]

Phase 2: Core Skills
2.1 [specific skill/tool]
2.2 [specific skill/tool]
2.3 [specific skill/tool]
2.4 [specific skill/tool]

Generate roadmap for: ${career}`;

  const phasesResult = await getRoadmapModel().generateContent(phasesPrompt);
  const phases = parsePhasesFromResponse(phasesResult.response.text());
  if (!phases.length) throw new Error("Failed to parse AI response into phases");

  const roadmapNodes = await buildRoadmapNodes(phases, projectName);
  return {
    projectName: projectName.replace(/['"]/g, ""),
    phases,
    roadmapNodes,
  };
}

/**
 * Save a generated roadmap to the database.
 */
export async function createRoadmap({ title, phases, roadmapNodes }) {
  const user = await getDbUser();

  // ── Rate limit: 3 roadmap generations per hour per user ──────────────────────
  await checkRateLimit(roadmapGenerationLimiter, user.id, "roadmap generation (3/hour)");

  try {
    const roadmap = await prisma.roadmap.create({
      data: {
        userId: user.id,
        title,
        phases,
        roadmapNodes,
        completedSteps: [],
      },
    });
    // ── Invalidate roadmap list cache so next page load shows new roadmap ────────
    await invalidateCache(cacheKeys.roadmaps(user.id));
    return { success: true, roadmapId: roadmap.id };
  } catch (error) {
    console.error("Error creating roadmap:", error);
    return { success: false };
  }
}

/**
 * Get all roadmaps for the current user.
 */
export async function getRoadmapsByUser() {
  const user = await getDbUser();
  return cachedQuery({
    key: cacheKeys.roadmaps(user.id),
    ttl: 5 * 60, // 5 minutes
    fn: async () => {
      try {
        const roadmaps = await prisma.roadmap.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
        });
        return roadmaps.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));
      } catch (error) {
        console.error("Error fetching roadmaps:", error);
        return [];
      }
    },
  });
}

/**
 * Get a single roadmap by ID (ownership verified).
 */
export async function getRoadmapById(id) {
  const user = await getDbUser();
  try {
    const roadmap = await prisma.roadmap.findFirst({
      where: { id, userId: user.id },
    });
    if (!roadmap) return null;
    return {
      ...roadmap,
      createdAt: roadmap.createdAt.toISOString(),
      updatedAt: roadmap.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error("Error fetching roadmap:", error);
    return null;
  }
}

/**
 * Persist the set of completed step IDs for a roadmap.
 */
export async function updateCompletedSteps(id, completedSteps) {
  const user = await getDbUser();
  try {
    await prisma.roadmap.updateMany({
      where: { id, userId: user.id },
      data: { completedSteps },
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating completed steps:", error);
    return { success: false };
  }
}

/**
 * Delete a roadmap (ownership verified).
 */
export async function deleteRoadmap(id) {
  const user = await getDbUser();
  try {
    await prisma.roadmap.deleteMany({ where: { id, userId: user.id } });
    await invalidateCache(cacheKeys.roadmaps(user.id));
    return { success: true };
  } catch (error) {
    console.error("Error deleting roadmap:", error);
    return { success: false };
  }
}

/**
 * Generate actionable step-by-step instructions for a roadmap node.
 */
export async function generateStepInstructions(stepDescription) {
  try {
    const result = await getRoadmapModel().generateContent(
      `Provide 5 clear, actionable instructions for learning: "${stepDescription}".
Each instruction on a new line, no numbering, no markdown.
Keep each instruction under 20 words and very practical.`
    );
    const text = result.response.text();
    return text
      .split("\n")
      .map((l) => l.replace(/^[-•*\d.]+\s*/, "").trim())
      .filter((l) => l.length > 10)
      .slice(0, 6);
  } catch (error) {
    console.error("Error generating step instructions:", error);
    return [
      `Start by researching: ${stepDescription}`,
      `Find quality learning resources for ${stepDescription}`,
      `Follow a structured beginner tutorial`,
      `Build a small hands-on project to apply the skill`,
      `Review and refine through practice`,
    ];
  }
}
