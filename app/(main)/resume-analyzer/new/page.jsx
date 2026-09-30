import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import UploadForm from "../_components/upload-form";
import { getResumeAnalysisCount } from "@/actions/resume-analysis";

export const metadata = {
  title: "Analyze Resume — SensAI",
  description: "Upload your resume for AI-powered analysis",
};

const LIMIT = 5;

export default async function NewAnalysisPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const count = await getResumeAnalysisCount();
  if (count >= LIMIT) redirect("/resume-analyzer");

  return (
    <div className="space-y-6">
      {/* Header stays top-left */}
      <div className="flex flex-col gap-2">
        <Link href="/resume-analyzer">
          <Button variant="link" className="gap-2 pl-0">
            <ArrowLeft className="h-4 w-4" />
            Back to Analyzer
          </Button>
        </Link>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-title">Analyze Your Resume</h1>
        <p className="text-muted-foreground">
          Get AI feedback on ATS compatibility, content, structure, tone, and skills.
        </p>
      </div>

      {/* Form card centred */}
      <div className="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-gradient-to-b from-[#1A1C20] to-[#08090D] p-4 sm:p-8">
        <UploadForm />
      </div>
    </div>
  );
}
