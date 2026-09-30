"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Calendar, ArrowRight, Loader2, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteResumeAnalysis } from "@/actions/resume-analysis";

function getInitials(name) {
  return name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

function getScoreInfo(score) {
  if (score >= 70) return { stripe: "from-emerald-500", dot: "#22c55e", text: "#4ade80", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
  if (score >= 40) return { stripe: "from-amber-500",   dot: "#f59e0b", text: "#fbbf24", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
  return             { stripe: "from-red-500",     dot: "#ef4444", text: "#f87171", badge: "bg-red-500/10 text-red-400 border-red-500/20" };
}

function ScoreArc({ score }) {
  const r    = 20;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const { dot: stroke, text } = getScoreInfo(score);
  return (
    <div className="relative w-12 h-12 shrink-0">
      <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={stroke} strokeWidth="4"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold tabular-nums" style={{ color: text }}>{score}</span>
      </div>
    </div>
  );
}

export default function AnalysisCard({ analysis }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const isPending = analysis.status === "PENDING" || analysis.status === "PROCESSING";
  const isError   = analysis.status === "ERROR";
  const score     = analysis.overallScore ?? 0;
  const info      = !isPending && !isError ? getScoreInfo(score) : null;

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete analysis for ${analysis.jobTitle} at ${analysis.companyName}?`)) return;
    setDeleting(true);
    const result = await deleteResumeAnalysis(analysis.id);
    if (result.success) {
      toast.success("Analysis deleted");
      router.refresh();
    } else {
      toast.error("Failed to delete");
      setDeleting(false);
    }
  };

  return (
    <Link href={`/resume-analyzer/${analysis.id}`}>
      <div className="group rounded-2xl border border-white/10 bg-gradient-to-b from-[#1A1C20] to-[#08090D] overflow-hidden flex flex-col h-full hover:border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5 relative">

        {/* Score stripe at top */}
        <div className={`h-0.5 w-full ${isPending ? "bg-white/10 animate-pulse" : isError ? "bg-white/5" : `bg-gradient-to-r ${info?.stripe} to-transparent`}`} />



        <div className="p-4 flex flex-col flex-1">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center font-bold text-black text-xs shrink-0">
                {getInitials(analysis.companyName)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-white truncate">{analysis.companyName}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{analysis.jobTitle}</p>
              </div>
            </div>

            {isPending ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 shrink-0">
                <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
                <span className="text-[10px] text-muted-foreground">Analyzing</span>
              </div>
            ) : isError ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 shrink-0">
                <AlertCircle className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Error</span>
              </div>
            ) : (
              <ScoreArc score={score} />
            )}
          </div>

          {/* PDF preview — Google Docs Viewer works on all devices including mobile */}
          <div className="flex-1 rounded-lg overflow-hidden border border-white/5 aspect-[3/4] mb-4 relative bg-white/[0.02]">
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(analysis.resumeUrl)}&embedded=true`}
              className="absolute inset-0 w-full h-full border-0 pointer-events-none"
              loading="lazy"
              title={`${analysis.jobTitle} resume preview`}
            />
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(analysis.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
            {!isPending && !isError && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${info?.badge}`}>
                {score}/100
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-red-400 hover:bg-red-400/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {deleting
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Trash2 className="w-3.5 h-3.5" />}
            {deleting ? "Deleting…" : "Delete"}
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">
              {isPending ? "Processing..." : isError ? "Failed" : "View analysis"}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>
    </Link>
  );
}
