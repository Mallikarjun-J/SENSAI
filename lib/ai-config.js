/**
 * Centralized AI Configuration
 *
 * Provides module-specific API keys and model names configured via environment variables (.env),
 * with sensible fallbacks so that missing individual keys fall back cleanly to global keys.
 *
 * No AI model names or keys are hardcoded in the application logic.
 */

export const AI_CONFIG = {
  // Global / Universal fallback
  global: {
    get apiKey() {
      return process.env.GEMINI_API_KEY || "";
    },
    get model() {
      return process.env.GEMINI_MODEL || "gemini-2.5-flash";
    },
  },

  // Mock Interview & Voice AI (quiz generation, voice interview questions, scoring feedback)
  interview: {
    get apiKey() {
      return process.env.INTERVIEW_API_KEY || process.env.GEMINI_API_KEY || "";
    },
    get model() {
      return process.env.INTERVIEW_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash";
    },
  },

  // Resume Analyzer (PDF & text evaluation, ATS scoring, tailored suggestions)
  resumeAnalysis: {
    get apiKey() {
      return process.env.RESUME_ANALYSIS_KEY || process.env.GEMINI_API_KEY || "";
    },
    get model() {
      return process.env.RESUME_ANALYSIS_MODEL || "gemini-3.1-flash-lite";
    },
  },

  // Resume Builder (AI enhance bullets, summary rewrite, project description, text parse)
  resumeBuilder: {
    get apiKey() {
      return process.env.RESUME_BUILDER_API_KEY || process.env.GEMINI_API_KEY || "";
    },
    get model() {
      return process.env.RESUME_BUILDER_MODEL || "gemini-3.1-flash-lite";
    },
  },

  // Resume PDF Parser (Extract structured data when importing existing PDF resume)
  resumeParser: {
    get apiKey() {
      return process.env.RESUME_PARSER_API_KEY || process.env.GEMINI_API_KEY || "";
    },
    get model() {
      return process.env.RESUME_PARSER_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash";
    },
  },

  // Career Roadmap (Phases, steps, key topics, and instructions)
  roadmap: {
    get apiKey() {
      return (
        process.env.ROADMAP_API_KEY ||
        process.env.ROADMAP_API ||
        process.env.GEMINI_API_KEY ||
        ""
      );
    },
    get model() {
      return process.env.ROADMAP_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash";
    },
  },

  // AI Cover Letter (Tailored role-specific cover letter generation)
  coverLetter: {
    get apiKey() {
      return process.env.COVER_LETTER_API_KEY || process.env.GEMINI_API_KEY || "";
    },
    get model() {
      return process.env.COVER_LETTER_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash";
    },
  },

  // Dashboard Insights (Industry salary ranges, demand, market outlook, trends)
  dashboard: {
    get apiKey() {
      return process.env.DASHBOARD_API_KEY || process.env.GEMINI_API_KEY || "";
    },
    get model() {
      return process.env.DASHBOARD_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash";
    },
  },

  // User Skills Extraction (Normalizing step titles into recognized resume skills)
  userSkills: {
    get apiKey() {
      return (
        process.env.USER_SKILLS_API_KEY ||
        process.env.ROADMAP_API_KEY ||
        process.env.ROADMAP_API ||
        process.env.GEMINI_API_KEY ||
        ""
      );
    },
    get model() {
      return process.env.USER_SKILLS_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash";
    },
  },

  // Inngest Background Jobs (Weekly industry insights cron)
  inngest: {
    get apiKey() {
      return process.env.INNGEST_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
    },
    get model() {
      return process.env.INNGEST_GEMINI_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash";
    },
  },
};
