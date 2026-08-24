"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Map, Calendar, CheckCircle2, Trash2, ArrowRight, Loader2 } from "lucide-react";
import dayjs from "dayjs";
import { deleteRoadmap } from "@/actions/roadmap";

export default function RoadmapCard({ roadmap }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const nodes = Array.isArray(roadmap.roadmapNodes) ? roadmap.roadmapNodes : [];
  const completed = Array.isArray(roadmap.completedSteps) ? roadmap.completedSteps : [];
  const stepNodes = nodes.filter((n) => n.isStep);
  const phaseCount = nodes.filter((n) => n.isPhase).length;
  const completionPct =
    stepNodes.length > 0 ? Math.round((completed.length / stepNodes.length) * 100) : 0;

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this roadmap? This cannot be undone.")) return;
    setDeleting(true);
    const result = await deleteRoadmap(roadmap.id);
    if (result.success) {
      toast.success("Roadmap deleted");
      router.refresh();
    } else {
      toast.error("Failed to delete roadmap");
      setDeleting(false);
    }
  };

  return (
    <div className="group rounded-2xl border border-white/10 bg-gradient-to-b from-[#1A1C20] to-[#08090D] p-6 flex flex-col gap-4 hover:border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5 relative overflow-hidden">
      {/* Glow accent */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-5 blur-2xl pointer-events-none"
        style={{ background: "#a78bfa" }} />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-11 rounded-xl border border-white/10"
            style={{ background: "rgba(167,139,250,0.1)" }}>
            <Map className="h-5 w-5" style={{ color: "#a78bfa" }} />
          </div>
          <div>
            <h3 className="font-semibold text-white leading-tight line-clamp-2">
              {roadmap.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {phaseCount} phases · {stepNodes.length} steps
            </p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 flex-shrink-0"
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3" style={{ color: "#4ade80" }} />
            {completed.length} / {stepNodes.length} steps
          </span>
          <span className="font-semibold" style={{ color: completionPct === 100 ? "#4ade80" : "#a78bfa" }}>
            {completionPct}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${completionPct}%`,
              background:
                completionPct === 100
                  ? "linear-gradient(to right, #4ade80, #22c55e)"
                  : "linear-gradient(to right, #a78bfa, #8b5cf6)",
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {dayjs(roadmap.createdAt).format("MMM D, YYYY")}
        </span>
        <Button size="sm" className=" gap-1.5 text-xs h-8" asChild>
          <Link href={`/career-roadmap/${roadmap.id}`}>
            {completionPct === 100 ? "Review" : "Continue"}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
