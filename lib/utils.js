import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { interviewCovers } from "@/constants/interview";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getRandomInterviewCover() {
  return interviewCovers[Math.floor(Math.random() * interviewCovers.length)];
}