import { z } from "zod";

// ── Month-year date utilities ─────────────────────────────────────────────────

const MONTH_MAP = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

/** Parse "Jan 2022" or "January 2022" → Date object. Returns null if unparseable. */
export function parseMonthYear(str) {
  if (!str?.trim()) return null;
  const match = str.trim().match(/^([a-zA-Z]+)\s+(\d{4})$/);
  if (!match) return null;
  const monthNum = MONTH_MAP[match[1].toLowerCase()];
  const year = parseInt(match[2], 10);
  if (monthNum === undefined || isNaN(year) || year < 1900 || year > 2100) return null;
  return new Date(year, monthNum, 1);
}

const PRESENT_KEYWORDS = ["present", "current", "till date", "ongoing", "now"];

function isPresent(val) {
  return PRESENT_KEYWORDS.includes((val ?? "").trim().toLowerCase());
}

function isFutureDate(str) {
  const parsed = parseMonthYear(str);
  if (!parsed) return false;
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return parsed > thisMonth;
}

// ── Shared date refinement helpers ───────────────────────────────────────────

function validatePastOrPresentDate(val, label = "Date") {
  if (!val?.trim()) return null; // empty → handled by required check separately
  if (isPresent(val)) return null; // "Present" always valid
  if (!parseMonthYear(val)) return `${label}: use format "Mon YYYY" (e.g. Jan 2022)`;
  if (isFutureDate(val)) return `${label} cannot be in the future`;
  return null; // valid
}

// ── Schemas ───────────────────────────────────────────────────────────────────

export const personalInfoSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
  profession: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .refine(
      (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v),
      { message: "Invalid email address" }
    )
    .optional(),
  phone: z
    .string()
    .trim()
    .refine(
      (v) => !v || /^[+\d][\d\s\-().]{4,17}$/.test(v),
      { message: "Invalid phone number" }
    )
    .optional(),
  location: z.string().trim().optional(),
  links: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string().trim().min(1, "Label is required"),
        url: z
          .string()
          .trim()
          .min(1, "URL is required")
          .refine(
            (v) => /^(https?:\/\/).+|([\w-]+\.[\w.-]{2,})/.test(v),
            { message: "Enter a valid URL (e.g. https://linkedin.com/...)" }
          ),
      })
    )
    .optional(),
});

export const experienceEntrySchema = z
  .object({
    company:     z.string().trim().min(1, "Company name is required"),
    position:    z.string().trim().min(1, "Job title is required"),
    startDate:   z
      .string()
      .trim()
      .min(1, "Start date is required")
      .refine((v) => !isFutureDate(v), { message: "Start date cannot be in the future" }),
    endDate:     z.string().trim().optional(),
    isCurrent:   z.boolean().optional(),
    description: z.string().optional(),
  })
  .refine(
    (val) => val.isCurrent || !!val.endDate?.trim(),
    { path: ["endDate"], message: 'End date required (or check "Currently working here")' }
  )
  .refine(
    (val) => {
      if (val.isCurrent || !val.endDate?.trim() || isPresent(val.endDate)) return true;
      return !isFutureDate(val.endDate);
    },
    { path: ["endDate"], message: "End date cannot be in the future" }
  )
  .refine(
    (val) => {
      if (val.isCurrent || !val.endDate?.trim() || isPresent(val.endDate)) return true;
      const start = parseMonthYear(val.startDate);
      const end   = parseMonthYear(val.endDate);
      if (!start || !end) return true;
      return end >= start;
    },
    { path: ["endDate"], message: "End date must be after start date" }
  );

export const experienceArraySchema = z.array(experienceEntrySchema);

export const educationEntrySchema = z.object({
  institution: z.string().trim().min(1, "Institution name is required"),
  degree: z.string().trim().min(1, "Degree is required"),
  field: z.string().trim().optional(),
  // graduationDate is intentionally allowed to be future (expected graduation)
  graduationDate: z.string().trim().optional(),
  gpa: z
    .string()
    .trim()
    .refine(
      (v) => !v || /^\d+(\.\d+)?\s*%?$/.test(v.trim()),
      { message: "GPA should be a number (e.g. 8.5 or 85%)" }
    )
    .optional(),
});

export const educationArraySchema = z.array(educationEntrySchema);

export const projectEntrySchema = z.object({
  name: z.string().trim().min(1, "Project name is required"),
  type: z.string().trim().optional(),
  link: z.string().trim().optional(),
  description: z.string().optional(),
});

export const projectArraySchema = z.array(projectEntrySchema);

export const customSectionEntrySchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Entry title is required"),
  subtitle: z.string().optional(),
  date: z
    .string()
    .trim()
    .optional(),
  description: z.string().optional(),
});

export const customSectionItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Section name is required"),
  entries: z.array(customSectionEntrySchema),
});

export const customSectionsSchema = z.array(customSectionItemSchema);

// ── Error utilities ───────────────────────────────────────────────────────────

/**
 * Convert a ZodError into a flat Record<string, string>.
 * Paths like [0, "company"] become "0.company".
 */
export function formatZodErrors(zodError) {
  const out = {};
  for (const issue of zodError.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Run safeParse and return a flat error map (empty if valid).
 */
export function validateSection(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return {};
  return formatZodErrors(result.error);
}
