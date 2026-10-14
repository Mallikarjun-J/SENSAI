import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { interviewCovers } from "@/constants/interview";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getRandomInterviewCover() {
  return interviewCovers[Math.floor(Math.random() * interviewCovers.length)];
}

/**
 * Converts raw markdown/AI responses into clean, human-readable normal text.
 * Strips bold/italic markers, backticks, header hashes, AI preambles, and formats lists cleanly.
 */
export function formatPlainText(text) {
  if (!text || typeof text !== "string") return "";

  let cleaned = text
    // Remove code block backticks
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    // Remove common conversational AI preambles
    .replace(/^(?:Here (?:are|is) (?:the |your )?(?:knowledge gaps?|improvement tips?|summary|feedback)[^:\n]*:?\s*)+/i, "")
    // Break up Question headers onto their own clean block
    .replace(/(?:^|\s+)\*{0,2}(Question\s+\d+[^*\n]+?)\*{0,2}(?=\s*[*•-]?\s*(?:\*\*|\b)(?:Knowledge Gap|Improvement Tip|Tip|Gap)\b|$)/gi, "\n\n$1\n")
    // Format bullet points for Knowledge Gap / Improvement Tip only if preceded by bullet/asterisk/newline
    .replace(/(?:^|\n|\s*[*•-])\s*\*{0,2}(Knowledge Gap|Improvement Tip|Tip|Gap):\*{0,2}\s*/gi, "\n• $1: ")
    // Strip bold markdown tags (**bold**, __bold__)
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/__([^_\n]+)__/g, "$1")
    // Normalize asterisks / dash bullet markers at beginning of lines to standard bullet
    .replace(/^[ \t]*[*•-][ \t]+/gm, "• ")
    // Strip italic markdown tags (*italic*, _italic_) without crossing newlines or matching bullets
    .replace(/(^|[^\w*])\*([^*\n\s][^*\n]*?[^*\n\s])\*(?=[^\w*]|$)/g, "$1$2")
    .replace(/(^|[^\w_])_([^_\n\s][^_\n]*?[^_\n\s])_(?=[^\w_]|$)/g, "$1$2")
    // Strip markdown headers
    .replace(/^#{1,6}\s+/gm, "")
    // Clean any remaining double asterisks
    .replace(/\*{2,}/g, "")
    // Normalize excessive newlines and spaces
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned;
}