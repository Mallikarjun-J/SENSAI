# SensAI — Exhaustive Project Documentation

> **Scope**: Every file, every function, every state variable, every AI prompt, every database query, every constant, every config setting. Nothing skipped.

---

## Table of Contents

1. [Tech Stack & Dependencies](#1-tech-stack--dependencies)
2. [Environment Variables](#2-environment-variables)
3. [Configuration Files](#3-configuration-files)
4. [Database Schema (Prisma)](#4-database-schema-prisma)
5. [Authentication & Middleware](#5-authentication--middleware)
6. [Utility Functions & Hooks](#6-utility-functions--hooks)
7. [Server Actions — Every Function](#7-server-actions--every-function)
8. [API Routes — Every Endpoint](#8-api-routes--every-endpoint)
9. [Layouts & Root Pages](#9-layouts--root-pages)
10. [Feature: Dashboard & Industry Insights](#10-feature-dashboard--industry-insights)
11. [Feature: Resume Builder](#11-feature-resume-builder)
12. [Feature: Resume Analyzer](#12-feature-resume-analyzer)
13. [Feature: AI Cover Letter](#13-feature-ai-cover-letter)
14. [Feature: Interview — Quiz Practice](#14-feature-interview--quiz-practice)
15. [Feature: Interview — Voice Mock Interview](#15-feature-interview--voice-mock-interview)
16. [Feature: Career Roadmap](#16-feature-career-roadmap)
17. [LiveKit Python Agent — Full Breakdown](#17-livekit-python-agent--full-breakdown)
18. [Static Data & Constants](#18-static-data--constants)
19. [Shadcn/Radix UI Components](#19-shadcnradix-ui-components)

---

## 1. Tech Stack & Dependencies

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.0.10 |
| UI Library | React | 19.2.3 |
| Styling | Tailwind CSS | 4.1.17 |
| Component Library | Shadcn UI (Radix primitives) | `new-york` style |
| Auth | Clerk (`@clerk/nextjs`) | 6.35.4 |
| Database | PostgreSQL (Neon) via Prisma ORM | Prisma 7.8.0 |
| AI/LLM (primary) | Google Gemini (`@google/genai`, `@google/generative-ai`) | Various models |
| AI/LLM (voice) | OpenAI GPT-4.1-mini (via LiveKit agent) | — |
| Vercel AI SDK | `ai` + `@ai-sdk/google` | 7.0.22 |
| Real-time Voice | LiveKit (`livekit-client`, `livekit-server-sdk`) | — |
| STT | Deepgram Nova-3 (English) | — |
| TTS | Cartesia Sonic-3 (Voice: "Tessa") | — |
| File Uploads | UploadThing | 7.7.4 |
| Background Jobs | Inngest | 3.46.0 |
| Charts | Recharts | 3.5.0 |
| Interactive Graphs | `@xyflow/react` (ReactFlow) | 12.11.2 |
| Markdown Editor | `@uiw/react-md-editor` | 4.0.8 |
| Forms | `react-hook-form` + `zod` | 7.66.1 / 4.1.12 |
| Date Utils | `date-fns`, `dayjs` | — |
| Toasts | Sonner | 2.0.7 |
| Loaders | `react-spinners` (`BarLoader`, `ClipLoader`) | — |
| PDF Export | `html2pdf.js` + browser `window.print()` | — |
| Icons | `lucide-react` | 0.554.0 |
| React Compiler | `babel-plugin-react-compiler` (experimental) | 1.0.0 |

---

## 2. Environment Variables

All env var **key names** used across the project (values redacted):

| Variable | Used By | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk client | Public Clerk key |
| `CLERK_SECRET_KEY` | Clerk server | Secret Clerk key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Clerk routing | Sign-in page path |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Clerk routing | Sign-up page path |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL` | Clerk | Redirect after sign-up → `/onboarding` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL` | Clerk | Redirect after sign-in → `/onboarding` |
| `DATABASE_URL` | Prisma | Neon PostgreSQL connection string |
| `GEMINI_API_KEY` | Server actions | Google Gemini API key (cover letters, quizzes, insights) |
| `ROADMAP_API` | `actions/roadmap.js` | Separate Gemini key for roadmap generation |
| `RESUME_ANALYSIS_KEY` | `lib/resume-ai.js` | Gemini key for resume analysis |
| `NEXT_PUBLIC_LIVEKIT_URL` | Frontend LiveKit client | LiveKit WebSocket URL |
| `LIVEKIT_URL` | Python agent / API | LiveKit server URL |
| `LIVEKIT_API_KEY` | API route + Python agent | LiveKit auth key |
| `LIVEKIT_API_SECRET` | API route + Python agent | LiveKit auth secret |
| `LIVEKIT_AGENT_NAME` | Python agent | Agent name, defaults to `"sensai-interview-agent"` |
| `OPENAI_API_KEY` | Python agent (implicit) | Used by `inference.LLM(model="openai/gpt-4.1-mini")` |
| `UPLOADTHING_TOKEN` | UploadThing | File upload service token |

---

## 3. Configuration Files

### [`next.config.mjs`](file:///c:/Users/malli/OneDrive/Desktop/sensai/next.config.mjs)
```js
reactCompiler: true  // Enables experimental React Compiler
images.remotePatterns: [
  "https://randomuser.me/api/**",   // Testimonial avatars
  "https://img.clerk.com"           // Clerk user avatars
]
```

### [`tailwind.config.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/tailwind.config.js)
- `darkMode: ["class"]` — toggled via CSS class
- Scans `./pages`, `./components`, `./app` for utility classes
- Extends colors with CSS variables: `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, and 5 `chart` colors
- Custom animations: `accordion-down`, `accordion-up`
- Plugin: `tailwindcss-animate`

### [`components.json`](file:///c:/Users/malli/OneDrive/Desktop/sensai/components.json) (Shadcn UI config)
- Style: `"new-york"`
- RSC: `true`
- Base color: `neutral`
- CSS variables: enabled
- Aliases: `@/components`, `@/lib/utils`, `@/components/ui`, `@/lib`, `@/hooks`

### [`prisma.config.ts`](file:///c:/Users/malli/OneDrive/Desktop/sensai/prisma.config.ts)
- Schema path: `"prisma/schema.prisma"`
- Migrations: `"prisma/migrations"`
- Datasource URL: `env("DATABASE_URL")` via `dotenv/config`

### [`postcss.config.mjs`](file:///c:/Users/malli/OneDrive/Desktop/sensai/postcss.config.mjs)
- Plugin: `@tailwindcss/postcss`

### [`eslint.config.mjs`](file:///c:/Users/malli/OneDrive/Desktop/sensai/eslint.config.mjs)
- Extends: `nextVitals` (strict Core Web Vitals linting)
- Ignores: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`

---

## 4. Database Schema (Prisma)

Located at [`prisma/schema.prisma`](file:///c:/Users/malli/OneDrive/Desktop/sensai/prisma/schema.prisma). Uses PostgreSQL. Output generated to `lib/generated/prisma`.

### Model: `User`
| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(uuid())` | Primary key |
| `clerkUserId` | `String @unique` | Links to Clerk auth |
| `email` | `String @unique` | |
| `name` | `String?` | |
| `imageUrl` | `String?` | |
| `industry` | `String?` | Combined slug e.g. `"tech-software-development"` |
| `bio` | `String?` | Professional bio |
| `experience` | `Int?` | Years of experience |
| `skills` | `String[]` | Array of skill strings |
| **Relations** | `Assessment[]`, `Resume[]`, `CoverLetter[]`, `Interview[]`, `VoiceFeedback[]`, `Roadmap[]`, `ResumeAnalysis[]`, `IndustryInsight?` | |

### Model: `Assessment` (Quiz results)
| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `userId` | `String` | FK → User |
| `quizScore` | `Float` | Overall percentage |
| `questions` | `Json[]` | Array of `{question, answer, userAnswer, isCorrect}` |
| `category` | `String` | Always `"Technical"` currently |
| `improvementTip` | `String?` | AI-generated tip based on wrong answers |

### Model: `Resume`
| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `userId` | `String` | FK → User (cascade delete) |
| `title` | `String` | Default: `"Untitled Resume"` |
| `template` | `String` | Default: `"classic"` |
| `ascentColor` | `String` | Default: `"#a78bfa"` (purple) |
| `professionalSummary` | `String` | Default: `""` |
| `skills` | `Json` | Default: `"[]"` |
| `personalInfo` | `Json` | Default: `"{}"` |
| `experience` | `Json` | Default: `"[]"` |
| `projects` | `Json` | Default: `"[]"` |
| `education` | `Json` | Default: `"[]"` |
| `sectionOrder` | `Json` | Default: `"[]"` |
| `customSections` | `Json` | Default: `"[]"` |

### Model: `CoverLetter`
| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `userId` | `String` | FK → User |
| `content` | `String` | Markdown content |
| `jobDescription` | `String?` | |
| `companyName` | `String` | |
| `jobTitle` | `String` | |
| `status` | `String` | Default: `"draft"` (or `"completed"`) |

### Model: `Interview`
| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `userId` | `String` | FK → User (cascade delete) |
| `role` | `String` | Target role |
| `level` | `String` | Junior/Mid/Senior |
| `type` | `String` | Technical/Behavioral/Mixed |
| `techstack` | `String[]` | Array of technologies |
| `questions` | `String[]` | Generated question strings |
| `finalized` | `Boolean` | Default: `false` |
| **Relations** | `VoiceFeedback[]` | |

### Model: `VoiceFeedback`
| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `interviewId` | `String` | FK → Interview (cascade delete) |
| `userId` | `String` | FK → User (cascade delete) |
| `totalScore` | `Int` | 0-100 |
| `categoryScores` | `Json` | `{communication, technical, problemSolving, culturalFit, confidence}` with score + comment each |
| `strengths` | `String` | |
| `areasForImprovement` | `String` | |
| `finalAssessment` | `String` | |

### Model: `Roadmap`
| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `userId` | `String` | FK → User (cascade delete) |
| `title` | `String` | |
| `phases` | `Json` | Default: `"[]"` |
| `roadmapNodes` | `Json` | Default: `"[]"` — ReactFlow node definitions |
| `completedSteps` | `Json` | Default: `"[]"` — IDs of completed steps |

### Model: `ResumeAnalysis`
| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `userId` | `String` | FK → User (cascade delete) |
| `companyName` | `String` | |
| `jobTitle` | `String` | |
| `jobDescription` | `String` | `@db.Text` (long text) |
| `resumeUrl` | `String` | UploadThing CDN URL |
| `resumeKey` | `String` | UploadThing file key (used for deletion) |
| `status` | `ResumeAnalysisStatus` | Enum: `PENDING`, `PROCESSING`, `DONE`, `ERROR` |
| `overallScore` | `Int?` | |
| `feedback` | `Json?` | Full structured feedback |

### Model: `IndustryInsight`
| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `industry` | `String @unique` | e.g. `"tech-software-development"` |
| `salaryRanges` | `Json[]` | `[{ role, min, max, median, location }]` |
| `growthRate` | `Float` | Percentage |
| `demandLevel` | `String` | `"High"`, `"Medium"`, `"Low"` |
| `topSkills` | `String[]` | |
| `marketOutlook` | `String` | `"Positive"`, `"Neutral"`, `"Negative"` |
| `keyTrends` | `String[]` | |
| `recommendedSkills` | `String[]` | |
| `nextUpdate` | `DateTime` | Scheduled 7 days from creation |

---

## 5. Authentication & Middleware

### [`proxy.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/proxy.js) (Middleware)
Uses `clerkMiddleware` from `@clerk/nextjs/server`.

**Protected routes** (regex match):
- `/dashboard(.*)`
- `/resume(.*)`
- `/resume-analyzer(.*)`
- `/career-roadmap(.*)`
- `/interview(.*)`
- `/ai-cover-letter(.*)`
- `/onboarding(.*)`

**Logic**: If no `userId` in `auth()` AND route matches a protected pattern → `auth().redirectToSignIn()`.

### [`lib/checkUser.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/lib/checkUser.js)
- Calls `currentUser()` from Clerk
- Looks up user in DB: `db.user.findUnique({ where: { clerkUserId } })`
- If not found, creates: `db.user.create({ data: { clerkUserId, name, imageUrl, email } })`
- Returns the DB user object

### Auth pattern in server actions
Every server action follows this pattern:
```js
const { userId } = await auth();
if (!userId) throw new Error("Unauthorized");
const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
if (!user) throw new Error("User not found");
```

---

## 6. Utility Functions & Hooks

### [`lib/utils.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/lib/utils.js)
```js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```
Also exports `getRandomInterviewCover()` which picks a random URL from the `interviewCovers` array.

### [`lib/prisma.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/lib/prisma.js) (or `.ts`)
- Singleton pattern: stores Prisma client on `globalThis` in development to survive HMR
- Uses `@prisma/adapter-pg` with `PrismaPg` for edge/serverless connection pooling

### [`app/lib/helper.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/lib/helper.js)
```js
export function entriesToMarkdown(entries, type)
```
Transforms JSON arrays (experience, education, projects) into structured Markdown strings with headings, bullet points, and date formatting.

### [`hooks/use-fetch.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/hooks/use-fetch.js)
```js
export default function useFetch(cb)
// Returns: { data, loading, error, fn, setData }
```
- Wraps any async function with `loading`, `error`, `data` state management
- On error: calls `toast.error(error.message)` from Sonner
- `fn(...args)` triggers the async call
- `setData` allows manual data override

---

## 7. Server Actions — Every Function

### [`actions/cover-letter.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/actions/cover-letter.js)

#### `generateCoverLetter(data)`
- **Params**: `{ jobTitle, companyName, jobDescription }`
- **Returns**: Prisma `CoverLetter` object
- **AI Model**: `gemini-2.5-flash` via `GoogleGenerativeAI`
- **Exact Prompt**:
  ```
  Write a professional cover letter for a ${data.jobTitle} position at ${data.companyName}.
  
  About the candidate:
  - Industry: ${user.industry}
  - Years of Experience: ${user.experience}
  - Skills: ${user.skills?.join(", ")}
  - Professional Background: ${user.bio}
  
  Job Description:
  ${data.jobDescription}
  
  Requirements:
  1. Use a professional, enthusiastic tone
  2. Highlight relevant skills and experience
  3. Show understanding of the company's needs
  4. Keep it concise (max 400 words)
  5. Use proper business letter formatting in markdown
  6. Include specific examples of achievements
  7. Relate candidate's background to job requirements
  
  Format the letter in markdown.
  ```
- **DB Write**: `prisma.coverLetter.create({ data: { content, jobDescription, companyName, jobTitle, status: "completed", userId: user.id } })`
- **Error**: `"Failed to generate cover letter"`

#### `getCoverLetters()`
- **Returns**: Array of cover letters, ordered by `createdAt: "desc"`
- **DB Query**: `prisma.coverLetter.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } })`

#### `getCoverLetter(id)`
- **Returns**: Single cover letter or null
- **DB Query**: `prisma.coverLetter.findUnique({ where: { id, userId: user.id } })`

#### `deleteCoverLetter(id)`
- **DB Query**: `prisma.coverLetter.delete({ where: { id, userId: user.id } })`

---

### [`actions/dashboard.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/actions/dashboard.js)

#### `generateAIInsights(industry)`
- **AI Model**: `gemini-2.5-flash`
- **Exact Prompt**:
  ```
  Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format without any additional notes or explanations:
  {
    "salaryRanges": [
      { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
    ],
    "growthRate": number,
    "demandLevel": "High" | "Medium" | "Low",
    "topSkills": ["skill1", "skill2"],
    "marketOutlook": "Positive" | "Neutral" | "Negative",
    "keyTrends": ["trend1", "trend2"],
    "recommendedSkills": ["skill1", "skill2"]
  }
  
  IMPORTANT: Return ONLY the JSON. No additional text, notes, or markdown formatting.
  Include at least 5 common roles for salary ranges.
  Growth rate should be a percentage.
  Include at least 5 skills and trends.
  ```
- **Data Cleaning**: `text.replace(/```(?:json)?\n?/g, "").trim()` then `JSON.parse()`

#### `getIndustryInsights()`
- **DB Query**: `prisma.user.findUnique({ where: { clerkUserId }, include: { industryInsight: true } })`
- If no insight exists, calls `generateAIInsights(user.industry)` and creates one:
  `prisma.industryInsight.create({ data: { industry, ...insights, nextUpdate: new Date(Date.now() + 7*24*60*60*1000) } })`
- **Magic value**: `7 * 24 * 60 * 60 * 1000` = 1 week in ms for `nextUpdate`

---

### [`actions/interview.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/actions/interview.js)

**Constants**: `QUIZ_LIMIT = 7`, `VOICE_LIMIT = 7`

#### `generateQuiz()`
- **AI Model**: `gemini-2.5-flash`
- **Exact Prompt**:
  ```
  Generate 10 technical interview questions for a ${user.industry} professional
  ${user.skills?.length ? ` with expertise in ${user.skills.join(", ")}` : ""}.
  
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
  ```
- **Returns**: Array of question objects

#### `saveQuizResult(questions, answers, score)`
- **Limit check**: `prisma.assessment.count({ where: { userId } })` >= `QUIZ_LIMIT` → throws `"LIMIT_REACHED: You can only save up to 7 quizzes..."`
- **AI tip generation** (only if wrong answers exist):
  ```
  The user got the following ${user.industry} technical interview questions wrong:
  
  ${wrongQuestionsText}
  
  Based on these mistakes, provide a concise, specific improvement tip.
  Focus on the knowledge gaps revealed by these wrong answers.
  Keep the response under 2 sentences and make it encouraging.
  Don't explicitly mention the mistakes, instead focus on what to learn/practice.
  ```
- **DB Write**: `prisma.assessment.create({ data: { userId, quizScore, questions, category: "Technical", improvementTip } })`

#### `getAssessments()`
- **DB Query**: `prisma.assessment.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })`

#### `deleteAssessment(assessmentId)`
- **DB Query**: `prisma.assessment.delete({ where: { id: assessmentId, userId } })`

#### `generateVoiceInterviewQuestions({ role, level, type, techstack, amount })`
- **AI SDK**: Uses `generateObject` from Vercel AI SDK (`@ai-sdk/google`, model `gemini-2.5-flash`)
- **Returns**: Array of question strings

#### `createVoiceInterview({ role, level, type, techstack, questions, finalized = true })`
- **Limit check**: Count >= `VOICE_LIMIT` → throws `"LIMIT_REACHED"`
- **DB Write**: `prisma.interview.create({ data: { userId, role, level, type, techstack, questions, finalized } })`

#### `getVoiceInterviewById(id)`
- **DB Query**: `prisma.interview.findUnique({ where: { id, userId }, include: { feedback: true } })`

#### `getVoiceInterviewsByUserId()`
- **DB Query**: `prisma.interview.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, include: { feedback: true } })`

#### `createVoiceFeedback({ interviewId, userId, transcript, feedbackId })`
- **AI SDK**: Uses `generateObject` with `feedbackSchema` (Zod schema)
- **Prompt**: `"You are an AI interviewer analyzing a mock interview... Score the candidate from 0 to 100 in the following areas..."`
- **Schema fields**: `totalScore`, `communicationScore/Comment`, `technicalScore/Comment`, `problemSolvingScore/Comment`, `culturalFitScore/Comment`, `confidenceScore/Comment`, `strengths`, `areasForImprovement`, `finalAssessment`
- **DB Write**: Creates `VoiceFeedback` record with structured scores

#### `getVoiceFeedbackByInterviewId({ interviewId, userId })`
#### `getVoiceFeedbacksForUser()`

#### `deleteVoiceInterview(interviewId)`
- **DB Query**: `prisma.interview.delete({ where: { id: interviewId, userId } })` (cascades to VoiceFeedback)

---

### [`actions/resume.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/actions/resume.js)

**Constants**: `RESUME_LIMIT = 5`
**AI Models**: `gemini-3.1-flash-lite` (via OpenAI compatibility) for text; standard `GoogleGenerativeAI` for PDF parsing

#### `getUserResumes()`
- `prisma.resume.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } })`

#### `getResumeCount()`
- `prisma.resume.count({ where: { userId } })`

#### `createResume({ title })`
- Limit check → `"LIMIT_REACHED"`
- `prisma.resume.create({ data: { userId, title } })`

#### `getResumeById(resumeId)`
- `prisma.resume.findUnique({ where: { id: resumeId, userId } })`

#### `updateResume({ resumeId, data })`
- `prisma.resume.update({ where: { id: resumeId, userId }, data })`

#### `deleteResume(resumeId)`
- `prisma.resume.delete({ where: { id: resumeId, userId } })`

#### `renameResume({ resumeId, title })`
- `prisma.resume.update({ where: { id: resumeId, userId }, data: { title } })`

#### `enhanceSummary(text)`
- **Exact Prompt**: `"You are an expert in resume writing. Enhance the professional summary of a resume. The summary should be one to two statements highlighting key skills, experience, and career objectives. Make it compelling and ATS-friendly. Return only the enhanced text, no options, no commentary, no Markdown."`

#### `enhanceJobDescription({ description, position, company })`
- Enhances a job experience description using AI

#### `enhanceProjectDescription({ description, name, type })`
- Enhances a project description using AI

#### `enhanceCustomEntry({ sectionName, title, subtitle, description })`
- Enhances custom section content using AI

#### `parseResumeFromText({ title, resumeText })`
- Parses raw pasted text into structured resume JSON via AI

#### `parseResumeFromPdf({ title, pdfUrl })`
- Downloads PDF via `fetch(pdfUrl)`, converts to base64
- Sends to `gemini-3.1-flash-lite` with MIME type `application/pdf`
- Returns structured resume data

---

### [`actions/resume-analysis.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/actions/resume-analysis.js)

**Constants**: `ANALYSIS_LIMIT = 5`
Uses helper `getDbUser()` for auth.

#### `createResumeAnalysis({ companyName, jobTitle, jobDescription, resumeUrl, resumeKey })`
- Limit check → `"LIMIT_REACHED"`
- `prisma.resumeAnalysis.create({ data: { userId, companyName, jobTitle, jobDescription, resumeUrl, resumeKey } })`

#### `analyzeResumeAction(analysisId)`
- Sets status to `PROCESSING`
- Calls `analyzeResumeWithGemini(resumeUrl, jobDescription)` from `lib/resume-ai.js`
- On success: updates to `DONE` with `overallScore` and `feedback`
- On failure: updates to `ERROR`
- Revalidates paths: `/resume-analyzer`, `/resume-analyzer/${analysisId}`

#### `getResumeAnalyses()` / `getResumeAnalysis(id)` / `getResumeAnalysisCount()`

#### `deleteResumeAnalysis(id)`
- **Also deletes from CDN**: `new UTApi().deleteFiles([record.resumeKey])` (UploadThing)
- Then `prisma.resumeAnalysis.delete({ where: { id } })`

---

### [`lib/resume-ai.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/lib/resume-ai.js)

#### `analyzeResumeWithGemini(resumeUrl, jobDescription)`
- **AI SDK**: `@google/genai` (newer SDK), model `gemini-3.1-flash-lite`
- **API Key**: `process.env.RESUME_ANALYSIS_KEY`
- **Prompt**: `"You are a world-class expert in ATS..."` — asks for strict JSON output
- **Output Schema** (exact fields): `overallScore` (0-100), `ATS` (score + tips), `toneAndStyle` (score + tips), `content` (score + tips), `structure` (score + tips), `skills` (score + tips)
- Each category tip has `type: "good" | "improve"` and a `text` string

---

### [`actions/roadmap.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/actions/roadmap.js)

**Constants**: `ROADMAP_LIMIT = 2`, `PHASE_SPACING = 600`, `BRANCH_OFFSET = 380`, `STEP_SPACING = 280`

#### `generateRoadmap(career, { skills = [], experience = 0 })`
- **AI Model**: `gemini-2.5-flash` using `process.env.ROADMAP_API`
- Generates phases with steps, parses text iteratively
- Builds ReactFlow node layout with positioning math using the spacing constants
- **YouTube integration**: Scrapes `https://www.youtube.com/results?search_query=...` HTML to extract video links dynamically

#### `createRoadmap({ title, phases, roadmapNodes })`
- Limit check → throws error if >= `ROADMAP_LIMIT`
- `prisma.roadmap.create({ data: { userId, title, phases, roadmapNodes } })`

#### `getRoadmapsByUser()` / `getRoadmapById(id)` / `updateCompletedSteps(id, completedSteps)` / `deleteRoadmap(id)`

#### `generateStepInstructions(stepDescription)`
- Generates detailed learning instructions for a specific roadmap step

---

### [`actions/user.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/actions/user.js)

#### `updateUser(data)`
- Uses Prisma transaction: `prisma.$transaction(..., { timeout: 10000 })`
- Calls `generateAIInsights` if no `IndustryInsight` exists for user's industry

#### `getUserOnboardingStatus()`
- Returns `{ isOnboarded: Boolean }` — checks if `industry` field is set

#### `getUserProfile()`
- Returns `{ experience, skills, bio }`

#### `updateUserProfile({ experience, skills, bio })`
- `prisma.user.update({ where: { id }, data: { experience, skills, bio } })`

---

## 8. API Routes — Every Endpoint

### `POST /api/livekit/token`
**Request**:
```json
{ "type": "string", "userName": "string", "userId": "string",
  "interviewId": "string", "questions": [], "role": "string",
  "level": "string", "techstack": [] }
```
**Response**: `{ success: true, data: { token, url, roomName } }`
**Logic**: Creates LiveKit access token with metadata. Room name: `interview-${interviewId}` or `generate-${userId}-${randomUUID()}`. Creates room via `RoomServiceClient`, dispatches agent via `AgentDispatchClient`.

### `POST /api/parse-resume-pdf`
**Request**: `multipart/form-data` with `file` (PDF, max 4MB) and `title`
**Response**: `{ resumeId }` or `{ error }`
**Logic**: Auth check → limit check (`RESUME_LIMIT = 5`) → sends PDF to `gemini-2.5-flash` with `maxOutputTokens: 8192`, `temperature: 0.1` → parses response → creates `Resume` in DB → `revalidatePath("/resume")`

### `POST /api/roadmap/generate`
**Request**: `{ career, skills, experience }`
**Response**: `{ success: true, roadmapId, title }` or `{ error }`

### `POST /api/roadmap/instructions`
**Request**: `{ description }`
**Response**: `{ instructions }` or `{ error }`

### `GET/POST/PUT /api/inngest`
Serves Inngest webhook handlers. Exposes the `generateIndustryInsights` function for scheduled background jobs.

### `GET/POST /api/uploadthing`
UploadThing file router. Has one endpoint: `resumeUploader` accepting `{ pdf: { maxFileSize: "4MB", maxFileCount: 1 } }`. Middleware checks Clerk auth. Returns `{ url: file.ufsUrl, key: file.key }`.

---

## 9. Layouts & Root Pages

### [`app/layout.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/layout.js) (Root Layout)
**Providers (outside → inside)**:
1. `<ClerkProvider appearance={{ baseTheme: dark }}>`
2. `<html lang="en" suppressHydrationWarning>`
3. `<ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>`
4. `<ReactQueryProvider>` (TanStack Query)
5. `<Header />` + `<Toaster richColors />` (Sonner)
6. Footer: `"Made By MJ"`

**Metadata**: `{ title: "Sensai - AI Career Coach", description: "AI-powered career coaching platform" }`

### [`app/(auth)/layout.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(auth)/layout.js)
Just centers children: `<div className="flex justify-center pt-40">{children}</div>`

### [`app/(main)/layout.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/layout.js)
Wraps children in a container div. Renders a header section.

### [`app/page.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/page.js) (Landing Page)
- Checks `auth().userId` → redirects to `/dashboard` if logged in
- Renders in order:
  1. `<HeroSection />` — banner image with scroll parallax effect
  2. **Features grid** (4 items from `data/features.js`)
  3. **Stats section**: `50+` Industries, `1000+` Questions, `95%` Success Rate, `24/7` Support
  4. **How It Works** (4 steps from `data/howItWorks.js`)
  5. **Testimonials** (3 from `data/testimonial.js`)
  6. `<FaqAccordion />` — 6 FAQs from `data/faqs.js`
  7. **CTA** linking to `/dashboard`

### Auth Pages
- [`sign-in/[[...sign-in]]/page.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(auth)/sign-in/[[...sign-in]]/page.jsx): Returns `<SignIn />` from Clerk
- [`sign-up/[[...sign-up]]/page.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(auth)/sign-up/[[...sign-up]]/page.jsx): Returns `<SignUp />` from Clerk

### Onboarding Page
- [`onboarding/page.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/onboarding/page.jsx): Calls `getUserOnboardingStatus()`. If already onboarded → redirect `/dashboard`. Else renders `<OnboardingForm />`.

### [`components/header.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/components/header.jsx)
- Uses `<SignedIn>`, `<SignedOut>`, `<SignInButton>`, `<UserButton>` from Clerk
- Dropdown menu "Growth Tools": Cover Letter, Career Roadmap, Interview Prep, Build Resume, Resume Analyzer

---

## 10. Feature: Dashboard & Industry Insights

### [`dashboard/page.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/dashboard/page.jsx) (Server Component)
- Checks onboarding → redirects if not onboarded
- Fetches `getIndustryInsights()` and `getUserProfile()` via `Promise.all`
- Passes `insights` + `userProfile` to `<DashboardView>`

### [`dashboard/layout.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/dashboard/layout.js)
- Header: "Industry Insights"
- Wraps children in `<Suspense>` with `<BarLoader>` fallback

### [`dashboard/_components/dashboard-view.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/dashboard/_components/dashboard-view.jsx)
**State**: `editOpen` (boolean — controls Edit Profile modal)

**Helper functions**:
- `parseIndustry(slug)` → `{ industry, sub }` from slug like `"tech-software-development"`
- `getDemandLevelColor(level)` → maps `"high"/"medium"/"low"` to Tailwind bg colors
- `getMarketOutlookInfo(outlook)` → maps `"positive"/"neutral"/"negative"` to Lucide icons + text colors

**UI sections rendered**:
1. "Last updated" date badge (formatted with `date-fns`)
2. Edit Profile button → opens `<EditProfileModal>`
3. Industry/sub-industry header strip
4. **4 market overview cards**: Market Outlook, Industry Growth (`<Progress>` bar), Demand Level, Top Skills (as `<Badge>` components)
5. **Salary Ranges Chart**: `recharts` `<BarChart>` — transforms `salaryRanges` dividing values by 1000 for "K" display
6. **Industry Trends list**: maps `insights.keyTrends`
7. **Recommended Skills**: maps `insights.recommendedSkills` into `<Badge>` components

### [`dashboard/_components/edit-profile-modal.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/dashboard/_components/edit-profile-modal.jsx)
**State**: `saving` (boolean), `experience` (string), `bio` (string), `skills` (string[]), `skillInput` (string)
**Refs**: `skillRef` (auto-focus the tag input)

**Effects**: Resets all form state from `initialData` whenever modal opens

**Event handlers**:
- `addSkill(raw)`: splits by comma, trims, deduplicates via `Set`, appends
- `removeSkill(idx)`: removes skill at index
- `handleSkillKeyDown(e)`: Enter/comma → `addSkill`; Backspace on empty → remove last
- `handleSave()`: validates experience (0-50), bio length, min 1 skill → calls `updateUserProfile` → `router.refresh()`

---

## 11. Feature: Resume Builder

### [`resume/page.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/resume/page.jsx)
**State**: `createOpen`, `importOpen` (modals), `importTab` (`"pdf"` | `"text"`), `newTitle`, `importTitle`, `resumeText`, `pdfFile`, `pdfName`

**TanStack Query**:
- `useQuery` → `getUserResumes`
- `useMutation` → `createMut` (empty resume), `deleteMut`, `renameMut`, `importTextMut` (AI parse from text), `importPdfMut` (sends `FormData` to `/api/parse-resume-pdf`)

**UI**:
- Header showing count vs `RESUME_LIMIT` (5), with "Import" and "Create New" buttons
- Loading state: 3 skeleton pulse cards
- Empty state: CTA card
- Resume cards: inline rename on double-click

### [`resume/builder/[id]/page.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/resume/builder/[id]/page.jsx)
Server component. Fetches `getResumeById(id)`. Sets up `initial` object with safe fallback defaults (e.g. `sectionOrder` defaults to `["summary", "experience", "education", "projects", "skills"]`). Renders `<BuilderClient initial={initial} />`.

### [`resume/_components/BuilderClient.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/resume/_components/BuilderClient.jsx)
**State**:
- `data` — complete resume data tree (the entire resume object)
- `step` — current wizard step index (0-7)
- `leftPct` — width % of the left form panel (drag-to-resize)
- `showTemplates`, `showColors` — toggle dropdowns
- `formLeft` — pixel offset synced via `ResizeObserver` on `backLinkRef`

**Refs**: `containerRef`, `isDragging`, `templateRef`, `colorRef`, `backLinkRef`

**Wizard steps** (rendered based on `step` index):
| Step | Form Component |
|---|---|
| 0 | `PersonalInfoForm` |
| 1 | `ProfessionalSummaryForm` |
| 2 | `ExperienceForm` |
| 3 | `EducationForm` |
| 4 | `ProjectForm` |
| 5 | `SkillsForm` |
| 6 | `CustomSectionForm` |
| 7 | `SectionOrderForm` |

**Key behaviors**:
- **Column resizer**: Mouse drag handler clamping left panel between `MIN_WIDTH` and screen bounds
- **Template/Color popovers**: Close on outside click via document event listeners
- **Save button**: Triggers `updateResume` mutation
- **`.md` download**: Exports resume data as markdown file
- **PDF export**: Extracts `#resume-print-root` DOM node, applies forced A4 sizing, copies all stylesheets, opens in new tab → `window.print()`

**UI layout**: Full-screen overlay with:
- Top navbar: `.md` button, `PDF` button, `Save` button
- Split pane: Left (form wizard + template/color toolbar + progress bar), Drag Handle, Right (`<ResumePreview>` live preview)

---

## 12. Feature: Resume Analyzer

### [`resume-analyzer/page.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/resume-analyzer/page.jsx)
Server component. Fetches `getResumeAnalyses()` + `getResumeAnalysisCount()`. Shows grid of `<AnalysisCard>` components or empty state. "New Analysis" button disabled if `count >= 5`.

### [`resume-analyzer/_components/upload-form.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/resume-analyzer/_components/upload-form.jsx)
**State**: `step` (1/2/3), `form` (`{ companyName, jobTitle, jobDescription }`), `file` (PDF), `statusIndex`, `error`

**3-step flow**:
1. **Step 1**: Company Name, Job Title, Job Description inputs. Validates non-empty.
2. **Step 2**: Dropzone (`react-dropzone`) for PDF upload. Max 4MB. Shows file name/size.
3. **Step 3**: Loading screen with cycling status messages (every 2.5s interval)

**Submit flow**: Step 2 → Step 3 → `startUpload()` via UploadThing → `createResumeAnalysis()` → `analyzeResumeAction()` → redirect to result page

### [`resume-analyzer/_components/analysis-card.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/resume-analyzer/_components/analysis-card.jsx)
**Helper components**:
- `getInitials(name)`: first two initials of company name
- `getScoreInfo(score)`: ≥70 → green, ≥40 → amber, else → red
- `<ScoreArc />`: Custom SVG circular progress bar using `strokeDashoffset` calculation

**Features**: Card wrapped in `<Link>`. Shows score arc (or processing/error badge), company initials, job title, PDF iframe preview, delete button.

### [`resume-analyzer/_components/feedback-section.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/resume-analyzer/_components/feedback-section.jsx)
**State**: `open` (boolean, default from `defaultOpen` prop)
- Splits tips into `goodTips` (type `"good"`) and `improveTips` (type `"improve"`)
- Renders collapsible section with mini `<ScoreCircle>` and colored progress bar
- When expanded: "What's working" ✓ and "To improve" ⚠ lists side-by-side

---

## 13. Feature: AI Cover Letter

### [`ai-cover-letter/page.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/ai-cover-letter/page.jsx)
Server component. Fetches `getCoverLetters()`. Renders header + "Create New" link → `/ai-cover-letter/new`. Passes data to `<CoverLetterList>`.

### [`ai-cover-letter/new/page.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/ai-cover-letter/new/page.jsx)
Back link to `/ai-cover-letter`. Renders `<CoverLetterGenerator />` for the form.

### [`_components/cover-letter-preview.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/ai-cover-letter/_components/cover-letter-preview.jsx)
Uses `<MDEditor value={content} preview="preview" height={700} />` from `@uiw/react-md-editor` to render the cover letter markdown as formatted HTML.

---

## 14. Feature: Interview — Quiz Practice

### [`interview/page.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/interview/page.jsx)
Server component. Auth → fetches user + `getAssessments()`. Checks `QUIZ_LIMIT` (7). Renders `<InterviewNav>` tabs, usage counter, `<StatsCards>`, `<PerformanceChart>`, `<QuizList>` (or empty state).

### [`interview/_components/quiz.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/interview/_components/quiz.jsx)
**State**: `currentQuestion` (index), `answers` (string[]), `showExplanation` (boolean)

**Hooks**: `useFetch(generateQuiz)` → `generateQuizFn`, `useFetch(saveQuizResult)` → `saveQuizResultFn`

**Flow**:
1. Start → calls `generateQuizFn()` → loads 10 MCQ questions from AI
2. Displays questions one by one with `<RadioGroup>` options
3. "Show Explanation" button reveals correct answer + explanation
4. "Next Question" / "Finish Quiz" buttons
5. On finish → `calculateScore()` (exact string match with `correctAnswer`) → `saveQuizResultFn(questions, answers, score)` → shows `<QuizResult>`

### [`interview/_components/quiz-result.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/interview/_components/quiz-result.jsx)
Shows final score % with `<Progress>` bar, improvement tip, and full breakdown of all questions (correct/incorrect, user's answer vs actual, explanation).

### [`interview/_components/stats-cards.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/interview/_components/stats-cards.jsx)
3 metric cards: Average Score, Total Questions Practiced, Latest Score.

### [`interview/_components/performance-chart.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/interview/_components/performance-chart.jsx)
`recharts` `<LineChart>` plotting quiz scores over time (0-100 scale).

### [`interview/_components/quiz-list.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/interview/_components/quiz-list.jsx)
List of past quizzes. Each card: score, date, improvement tip, delete button. Click opens `<Dialog>` with `<QuizResult>` for that quiz.

---

## 15. Feature: Interview — Voice Mock Interview

### [`interview/voice/page.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/interview/voice/page.jsx)
Server component. Fetches `getVoiceInterviewsByUserId()` + `getVoiceFeedbacksForUser()`. Checks `VOICE_LIMIT` (7). Renders `<InterviewNav>`, `<VoiceStatsCards>`, `<VoicePerformanceChart>`, and interview cards.

### [`interview/voice/new/page.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/interview/voice/new/page.jsx)
Renders `<VoiceInterviewForm />`.

### [`interview/_components/voice-interview-form.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/interview/_components/voice-interview-form.jsx)
**State**: `role`, `level` (default `"Mid"`), `type` (default `"Mixed"`), `techInput`, `techstack` (array), `questionCount` (default 5, slider 3-15), `loading`, `showRoleSuggestions`, `showTechSuggestions`

**Constants**: `ROLE_SUGGESTIONS`, `TECH_SUGGESTIONS`, `LEVELS` (`["Junior", "Mid", "Senior"]`), `TYPES` (`["Technical", "Behavioral", "Mixed"]`)

**Submit flow**: Validates role → `generateVoiceInterviewQuestions({ role, level, type, techstack, amount: questionCount })` → `createVoiceInterview(...)` → `router.push(/interview/voice/[id])`

**UI elements**:
- Role text input with floating autocomplete suggestions
- Level/Type pill-style button groups
- Tech stack tag input with suggestion dropdown + quick-add popular tech buttons
- Question count: HTML `<input type="range">` (3-15) with CSS linear-gradient track fill
- Submit button with `<Loader2>` spinner

### [`interview/_components/agent.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/interview/_components/agent.jsx) — **THE CORE VOICE UI**
**State**:
- `callStatus`: `INACTIVE` | `CONNECTING` | `ACTIVE` | `FINISHED`
- `messages`: transcript log array `[{ role: "user"|"assistant", content }]`
- `isSpeaking`: boolean (AI speaking)
- `isMuted`: boolean (user mic)

**Refs**: `processedSegmentIds` (Set, prevents duplicate STT segments)

**Key functions**:
- `handleCall()`:
  1. Sets `callStatus = CONNECTING`
  2. Fetches token from `POST /api/livekit/token` with interview details
  3. Creates LiveKit `Room`
  4. Connects to WebSocket URL
  5. Enables local microphone
  6. Publishes `"interview-context"` data containing system prompt + questions
  7. Sets `callStatus = ACTIVE`
  
- `registerRoomListeners(room)`:
  - `TrackSubscribed`: attaches remote audio to hidden `<audio>` DOM element
  - `TranscriptionReceived`: appends final STT text to `messages` array (deduped by segment ID)
  - `DataReceived`: catches `"session-ended"` JSON → triggers end flow
  
- `handleDisconnect()`: Disconnects room, sets `callStatus = FINISHED`

- `handleGenerateFeedback()`: Pushes entire `messages` transcript to `createVoiceFeedback` server action

**UI**: Two side-by-side 3D gradient cards (AI Interviewer with glowing rings, User avatar). Real-time transcript log at bottom. Start/End/Mute buttons.

### [`interview/_components/voice-interview-card.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/interview/_components/voice-interview-card.jsx)
Summary card for a voice interview. Badge for type, role, date, feedback score. Shows `<DisplayTechIcons>`. CTA: either "Start Interview" (`/interview/voice/[id]`) or "View Feedback" (`/interview/voice/[id]/feedback`).

### Other voice components:
- `voice-stats-cards.jsx`: Average Score, Interviews Completed, Latest Score
- `voice-performance-chart.jsx`: `recharts` `<LineChart>` with purple stroke (`#a78bfa`)
- `delete-interview-button.jsx`: Trash icon → confirm → `deleteVoiceInterview` → toast + refresh
- `display-tech-icons.jsx`: Maps tech strings to devicon CDN URLs, shows up to 3 icons + overflow `+X` badge
- `interview-tabs.jsx`: Sub-nav pills: "Quiz Practice" (`/interview`) | "Voice Interview" (`/interview/voice`)

---

## 16. Feature: Career Roadmap

### [`career-roadmap/page.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/career-roadmap/page.jsx)
Server component. Fetches `getRoadmapsByUser()`. Limit: `ROADMAP_LIMIT` (2). Renders `<RoadmapCard>` grid or empty state.

### [`career-roadmap/_components/roadmap-canvas.jsx`](file:///c:/Users/malli/OneDrive/Desktop/sensai/app/(main)/career-roadmap/_components/roadmap-canvas.jsx)
**State**: `selectedNode` (object | null)

**Hooks**: `useNodesState`, `useEdgesState` from `@xyflow/react`

**Layout logic** (via `useMemo`):
- `flowNodes`: Maps backend nodes to ReactFlow format, injecting `completedSteps`, `onNodeClick`, and custom `THEME`
- `flowEdges`: Generates trunk edges (phase → phase sequentially) and branch edges (phase → sub-steps, alternating left/right)

**UI**: `<ReactFlow>` with `<Background>` (dots), `<Controls>`, custom node type `CustomRoadmapNode`, custom edge type `CustomEdge`. Clicking a node opens `<NodeDetail>` modal.

### Other roadmap components:
- `roadmap-card.jsx`: Card showing roadmap title, phase count, completion %, delete button
- `roadmap-viewer.jsx`: Wrapper for the canvas view
- `custom-roadmap-node.jsx`: Custom ReactFlow node with completion state
- `custom-edge.jsx`: Custom styled ReactFlow edge
- `node-detail.jsx`: Modal showing step details + "Mark Complete" toggle
- `create-roadmap-form.jsx`: Form to create a new roadmap with career goal input

---

## 17. LiveKit Python Agent — Full Breakdown

**File**: [`livekit-agent/agent.py`](file:///c:/Users/malli/OneDrive/Desktop/sensai/livekit-agent/agent.py)

### Environment Variables
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- `LIVEKIT_AGENT_NAME` (default: `"sensai-interview-agent"`)
- `OPENAI_API_KEY` (implicit, used by `inference.LLM`)

### Helper Functions

#### `_safe_json_loads(raw: str | None) -> dict[str, Any]`
Safely parses JSON. Returns `{}` on failure or non-dict result.

#### `_extract_questions(metadata: dict[str, Any]) -> list[str]`
Extracts the `questions` list from metadata dict.

### Class: `InterviewPrepAgent(Agent)`

#### `__init__(self, questions, user_name, role, level, techstack, room)`
Builds `full_instructions` system prompt:
- If `questions` list is provided: enumerates them as `"1. [Question]\n2. [Question]..."`
- If no questions: instructs LLM to generate exactly 5 relevant questions based on `role`, `level`, `techstack`
- **Strict rules in prompt**:
  - Ask questions ONE AT A TIME
  - Wait for candidate to fully finish speaking
  - Acknowledge briefly (1-2 sentences max) then ask next
  - NEVER answer the question yourself
  - NEVER provide hints or corrections
  - At the very end, say exactly the phrase: `"interview complete"`

**State variables**: `self._room`, `self._ended` (bool), `self._answer_count` (int), `self._total_questions` (int)

#### `on_enter(self)` (Lifecycle)
Kicks off the interview: `self.session.generate_reply(instructions="Greet the user...and immediately ask Question 1")`

#### `on_user_turn_completed(self, turn_ctx, new_message)` (Lifecycle)
Increments `_answer_count`. If `_answer_count >= (total_questions * 3 + 5)` and not ended → triggers `_delayed_end()` as backup.

#### `_delayed_end(self)`
Waits 90 seconds. If `self._ended` is still `False` → calls `end_session()`.

#### `end_session(self)`
Sets `self._ended = True`. Publishes `"session-ended"` JSON event via `self._room.local_participant.publish_data()`. Disconnects from room.

### Server Setup

```python
server = AgentServer()
server.setup_fnc = prewarm  # Loads Silero VAD model
```

### Entrypoint: `async def entrypoint(ctx: JobContext)`

1. Merges job metadata + room metadata
2. Extracts `userName`, `role`, `level`, `techstack`, `questions`
3. Creates `InterviewPrepAgent` instance
4. Configures `AgentSession`:
   - **STT**: Deepgram Nova-3 (English)
   - **LLM**: OpenAI `gpt-4.1-mini`
   - **TTS**: Cartesia Sonic-3, Voice ID `"6ccbfb76-1fc6-48f7-b71d-91ac6298247b"` (Tessa)
   - **Turn Detection**: `MultilingualModel`
   - **VAD**: From prewarmed Silero model
5. Registers `on_agent_speech_committed` callback:
   - Checks if committed speech text contains `"interview complete"` (case-insensitive)
   - If found and `agent._ended` is False → `asyncio.ensure_future(agent.end_session())`
6. Starts session with noise cancellation (`BVCTelephony` for SIP, `BVC` for others)

### Complete Interview Flow (end to end)
```
Frontend                          Backend API                    LiveKit Cloud              Python Agent
   │                                  │                              │                          │
   ├─ POST /api/livekit/token ───────→│                              │                          │
   │                                  ├─ Create token + room ───────→│                          │
   │                                  ├─ Dispatch agent ────────────→│─── Job dispatched ──────→│
   │←── { token, url, roomName } ─────│                              │                          │
   │                                  │                              │                          │
   ├─ Connect to room (WebSocket) ───────────────────────────────────→                          │
   ├─ Enable microphone                                              │                          │
   ├─ Publish "interview-context" data ──────────────────────────────→│──── Metadata merged ────→│
   │                                                                 │                          │
   │                                                                 │     entrypoint() runs    │
   │                                                                 │     AgentSession starts  │
   │                                                                 │     on_enter() fires     │
   │                                                                 │←── LLM greeting + Q1 ───│
   │←──── Audio track + transcription ───────────────────────────────│                          │
   │                                                                 │                          │
   │──── User speaks ───────────────→│ STT → text ──────────────────→│                          │
   │                                                                 │     LLM processes        │
   │←──── Agent responds + next Q ───────────────────────────────────│                          │
   │                                                                 │                          │
   │  ... repeats for all questions ...                              │                          │
   │                                                                 │                          │
   │                                                                 │  LLM says "interview     │
   │                                                                 │  complete"               │
   │                                                                 │  on_agent_speech_        │
   │                                                                 │  committed detects it    │
   │                                                                 │  end_session() fires     │
   │←──── "session-ended" data packet ───────────────────────────────│                          │
   │                                                                 │←── Room disconnect ──────│
   │                                                                 │                          │
   ├─ callStatus = FINISHED                                          │                          │
   ├─ createVoiceFeedback(transcript) ──→│                           │                          │
   │                                     │ AI evaluates transcript   │                          │
   │                                     │ Saves VoiceFeedback to DB │                          │
   │←── feedback saved ─────────────────│                           │                          │
   ├─ Redirect to feedback page                                      │                          │
```

---

## 18. Static Data & Constants

### [`data/faqs.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/data/faqs.js)
6 FAQ objects: `{ question, answer }`

### [`data/features.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/data/features.js)
4 feature objects: `{ icon (lucide-react component), title, description }`

### [`data/howItWorks.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/data/howItWorks.js)
4 step objects: `{ title, description, icon }`

### [`data/industries.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/data/industries.js)
15 industry sectors: `tech`, `finance`, `healthcare`, `manufacturing`, `retail`, `media`, `education`, `energy`, `consulting`, `telecom`, `transportation`, `agriculture`, `construction`, `hospitality`, `nonprofit`. Each has `name` + `subIndustries[]` (~13 items each).

### [`data/testimonial.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/data/testimonial.js)
3 testimonials: `{ quote, author, image (randomuser.me), role, company }`

### [`constants/interview.js`](file:///c:/Users/malli/OneDrive/Desktop/sensai/constants/interview.js)

**`techMappings`**: Maps text inputs (e.g. `"react.js"`, `"next.js"`, `"node.js"`) to normalized shortnames for icon resolution.

**`interviewerPromptTemplate`**: System prompt for the AI voice interviewer emphasizing short, conversational responses.

**`feedbackSchema`** (Zod):
```js
{
  totalScore: z.number(),
  communicationScore: z.number(),
  communicationComment: z.string(),
  technicalScore: z.number(),
  technicalComment: z.string(),
  problemSolvingScore: z.number(),
  problemSolvingComment: z.string(),
  culturalFitScore: z.number(),
  culturalFitComment: z.string(),
  confidenceScore: z.number(),
  confidenceComment: z.string(),
  strengths: z.string(),
  areasForImprovement: z.string(),
  finalAssessment: z.string()
}
```

**`interviewCovers`**: Array of 9 image URLs from `/covers/*.png`

**`getRandomInterviewCover()`**: Returns a random cover image URL.

---

## 19. Shadcn/Radix UI Components

All located in [`components/ui/`](file:///c:/Users/malli/OneDrive/Desktop/sensai/components/ui). Standard Shadcn wrappers using `React.forwardRef`, `class-variance-authority` (cva) for variants, and `cn()` for class merging:

| Component | Radix Primitive | Notes |
|---|---|---|
| `Accordion` | `@radix-ui/react-accordion` | Includes `AccordionItem`, `AccordionTrigger`, `AccordionContent` |
| `AlertDialog` | `@radix-ui/react-alert-dialog` | `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, etc. |
| `Button` | — | cva variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`. Sizes: `default`, `sm`, `lg`, `icon` |
| `Card` | — | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| `Dialog` | `@radix-ui/react-dialog` | `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, etc. |
| `DropdownMenu` | `@radix-ui/react-dropdown-menu` | Full menu with items, separators, checkboxes, radio groups |
| `Input` | — | Standard styled `<input>` |
| `Label` | `@radix-ui/react-label` | |
| `Progress` | `@radix-ui/react-progress` | Animated bar with `translateX` transform |
| `RadioGroup` | `@radix-ui/react-radio-group` | `RadioGroup`, `RadioGroupItem` |
| `Select` | `@radix-ui/react-select` | Full select with scroll buttons, groups, labels |
| `Tabs` | `@radix-ui/react-tabs` | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` |
| `Textarea` | — | Standard styled `<textarea>` |
| `Badge` | — | Variants: `default`, `secondary`, `destructive`, `outline` |

---

> **This document covers every file, every function, every state variable, every prompt, every database query, every API route, every constant, every configuration, and every architectural flow in the SensAI project.**
