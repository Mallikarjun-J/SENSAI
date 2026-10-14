import { Inngest } from "inngest";
import { AI_CONFIG } from "@/lib/ai-config";

export const inngest = new Inngest({
  id: "sensai", // Unique app ID
  name: "sensai",
  credentials: {
    gemini: {
      apiKey: AI_CONFIG.inngest.apiKey,
    },
  },
});