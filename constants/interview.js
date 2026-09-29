import { z } from "zod";

// ─── Tech name normalisation map ──────────────────────────────────────────────
export const techMappings = {
  "react.js": "react",
  reactjs: "react",
  react: "react",
  "next.js": "nextjs",
  nextjs: "nextjs",
  next: "nextjs",
  "vue.js": "vuejs",
  vuejs: "vuejs",
  vue: "vuejs",
  "express.js": "express",
  expressjs: "express",
  express: "express",
  "node.js": "nodejs",
  nodejs: "nodejs",
  node: "nodejs",
  mongodb: "mongodb",
  mongo: "mongodb",
  mongoose: "mongoose",
  mysql: "mysql",
  postgresql: "postgresql",
  sqlite: "sqlite",
  firebase: "firebase",
  docker: "docker",
  kubernetes: "kubernetes",
  aws: "aws",
  azure: "azure",
  gcp: "gcp",
  digitalocean: "digitalocean",
  heroku: "heroku",
  html5: "html5",
  html: "html5",
  css3: "css3",
  css: "css3",
  sass: "sass",
  scss: "sass",
  tailwindcss: "tailwindcss",
  tailwind: "tailwindcss",
  bootstrap: "bootstrap",
  typescript: "typescript",
  ts: "typescript",
  javascript: "javascript",
  js: "javascript",
  angular: "angular",
  nestjs: "nestjs",
  graphql: "graphql",
  redis: "redis",
  prisma: "prisma",
  redux: "redux",
  jest: "jest",
  docker: "docker",
  git: "git",
  github: "github",
  figma: "figma",
  vercel: "vercel",
  netlify: "netlify",
};

// ─── AI voice interviewer system prompt ───────────────────────────────────────
export const interviewerPromptTemplate = `You are a professional job interviewer conducting a real-time voice interview with a candidate. Your goal is to assess their qualifications, motivation, and fit for the role.

Interview Guidelines:
Follow the structured question flow:
{{questions}}

Engage naturally & react appropriately:
Listen actively to responses and acknowledge them before moving forward.
Ask brief follow-up questions if a response is vague or requires more detail.
Keep the conversation flowing smoothly while maintaining control.
Be professional, yet warm and welcoming:

Use official yet friendly language.
Keep responses concise and to the point (like in a real voice interview).
Avoid robotic phrasing—sound natural and conversational.
Answer the candidate's questions professionally:

If asked about the role, company, or expectations, provide a clear and relevant answer.
If unsure, redirect the candidate to HR for more details.

Conclude the interview properly:
Thank the candidate for their time.
Inform them that the company will reach out soon with feedback.
End the conversation on a polite and positive note.

- Be sure to be professional and polite.
- Keep all your responses short and simple. Use official language, but be kind and welcoming.
- This is a voice conversation, so keep your responses short, like in a real conversation. Don't ramble for too long.`;

// ─── Zod schema for AI feedback generation ────────────────────────────────────
const bulletPoint = z.object({
  title:   z.string(),                  // bold label, e.g. "Go deeper on trade-offs"
  detail:  z.string(),                  // explanation paragraph
  seenIn:  z.string().optional(),       // e.g. "Question 3" or "Question 3, Question 8"
});

export const feedbackSchema = z.object({
  totalScore: z.number(),

  communicationScore:        z.number(),
  communicationComment:      z.string(),
  communicationImprovements: z.array(bulletPoint).default([]),
  communicationStrengths:    z.array(bulletPoint).default([]),

  technicalScore:            z.number(),
  technicalComment:          z.string(),
  technicalImprovements:     z.array(bulletPoint).default([]),
  technicalStrengths:        z.array(bulletPoint).default([]),

  problemSolvingScore:        z.number(),
  problemSolvingComment:      z.string(),
  problemSolvingImprovements: z.array(bulletPoint).default([]),
  problemSolvingStrengths:    z.array(bulletPoint).default([]),

  culturalFitScore:           z.number(),
  culturalFitComment:         z.string(),
  culturalFitImprovements:    z.array(bulletPoint).default([]),
  culturalFitStrengths:       z.array(bulletPoint).default([]),

  confidenceScore:            z.number(),
  confidenceComment:          z.string(),
  confidenceImprovements:     z.array(bulletPoint).default([]),
  confidenceStrengths:        z.array(bulletPoint).default([]),

  strengths:            z.string(),
  areasForImprovement:  z.string(),
  finalAssessment:      z.string(),
});

// ─── Interview cover images ────────────────────────────────────────────────────
export const interviewCovers = [
  "/covers/adobe.png",
  "/covers/amazon.png",
  "/covers/facebook.png",
  "/covers/pinterest.png",
  "/covers/reddit.png",
  "/covers/spotify.png",
  "/covers/telegram.png",
  "/covers/tiktok.png",
  "/covers/yahoo.png",
];

export const getRandomInterviewCover = () =>
  interviewCovers[Math.floor(Math.random() * interviewCovers.length)];
