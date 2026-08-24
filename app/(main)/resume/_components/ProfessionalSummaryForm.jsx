"use client";
import { useState } from "react";
import { enhanceSummary } from "@/actions/resume";
import { toast } from "sonner";

export function ProfessionalSummaryForm({ value, onChange }) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-3">
      <textarea
        value={value ?? ""}
        rows={6}
        placeholder="Write a short, direct summary of who you are and what you've achieved."
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
      />
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={loading || !(value ?? "").trim() || (value ?? "").trim().length < 10}
          onClick={async () => {
            setLoading(true);
            try {
              const { enhancedContent } = await enhanceSummary(value);
              if (enhancedContent) onChange(enhancedContent);
              toast.success("Summary enhanced!");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "AI enhance failed");
            } finally {
              setLoading(false);
            }
          }}
          className="inline-flex items-center gap-2 rounded-md bg-primary/10 border border-primary/30 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : "✨"}
          {loading ? "Enhancing..." : "Enhance with AI"}
        </button>
        <p className="text-xs text-muted-foreground">
          Write a draft first, then enhance.
        </p>
      </div>
    </div>
  );
}
