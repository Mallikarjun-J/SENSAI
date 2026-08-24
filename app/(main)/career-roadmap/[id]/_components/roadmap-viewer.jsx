"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Share2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import RoadmapCanvas from "../../_components/roadmap-canvas";
import { updateCompletedSteps } from "@/actions/roadmap";

export default function RoadmapViewer({ roadmap }) {
  const router = useRouter();
  const [completedSteps, setCompletedSteps] = useState(
    new Set(Array.isArray(roadmap.completedSteps) ? roadmap.completedSteps : [])
  );

  const handleToggleStep = useCallback(
    async (nodeId, completed) => {
      const next = new Set(completedSteps);
      if (completed) {
        next.add(nodeId);
      } else {
        next.delete(nodeId);
      }
      setCompletedSteps(next);

      const result = await updateCompletedSteps(roadmap.id, [...next]);
      if (!result.success) {
        // Revert on failure
        setCompletedSteps(completedSteps);
        toast.error("Failed to save progress");
      }
    },
    [completedSteps, roadmap.id]
  );

  const nodes = Array.isArray(roadmap.roadmapNodes) ? roadmap.roadmapNodes : [];
  const stepNodes = nodes.filter((n) => n.isStep);
  const completionPct =
    stepNodes.length > 0
      ? Math.round((completedSteps.size / stepNodes.length) * 100)
      : 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-background/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/career-roadmap">
            <Button variant="ghost" size="sm" className="gap-2 rounded-full">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
          <div>
            <h1 className="font-semibold text-white text-sm sm:text-base leading-tight">
              {roadmap.title}
            </h1>
            <p className="text-xs text-muted-foreground">
              {completedSteps.size} / {stepNodes.length} steps · {completionPct}% complete
            </p>
          </div>
        </div>

        {/* Progress pill */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-28 h-1.5 rounded-full bg-white/5 overflow-hidden">
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
            <span className="text-xs font-semibold" style={{ color: completionPct === 100 ? "#4ade80" : "#a78bfa" }}>
              {completionPct}%
            </span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative min-h-0">
        <RoadmapCanvas
          nodes={nodes}
          completedSteps={completedSteps}
          onToggleStep={handleToggleStep}
        />
      </div>
    </div>
  );
}
