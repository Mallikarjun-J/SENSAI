import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { FileSearch, Plus } from "lucide-react";
import { getResumeAnalyses, getResumeAnalysisCount } from "@/actions/resume-analysis";
import AnalysisCard from "./_components/analysis-card";

export const metadata = {
  title: "Resume Analyzer — SensAI",
  description: "AI-powered resume analysis with ATS scoring and actionable feedback",
};

const LIMIT = 5;

export default async function ResumeAnalyzerPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [analyses, count] = await Promise.all([
    getResumeAnalyses(),
    getResumeAnalysisCount(),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-title">Resume Analyzer</h1>
          <p className="text-muted-foreground mt-2">
            Upload your resume and get instant AI feedback on ATS compatibility, content, structure, and more.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Usage counter */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.02] text-xs text-muted-foreground">
            <span className="font-semibold text-white">{count}</span>
            <span>/ {LIMIT} analyses</span>
          </div>
          <Button asChild disabled={count >= LIMIT}>
            <Link href="/resume-analyzer/new">
              <Plus className="h-4 w-4" />
              Analyze Resume
            </Link>
          </Button>
        </div>
      </div>

      {/* Grid or empty state */}
      {analyses.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {analyses.map((analysis) => (
            <AnalysisCard key={analysis.id} analysis={analysis} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#1A1C20] to-[#08090D] p-12 text-center space-y-5">
          <div
            className="flex items-center justify-center mx-auto size-20 rounded-2xl border border-white/10"
            style={{ background: "rgba(167,139,250,0.1)" }}
          >
            <FileSearch className="h-10 w-10" style={{ color: "#a78bfa" }} />
          </div>
          <div>
            <p className="text-white font-semibold text-lg">No analyses yet</p>
            <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
              Upload your resume PDF and Gemini AI will score it across ATS compatibility, tone, content, structure, and skills.
            </p>
          </div>
          <Button asChild >
            <Link href="/resume-analyzer/new">
              <Plus className="h-4 w-4" />
              Analyze Your Resume
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
