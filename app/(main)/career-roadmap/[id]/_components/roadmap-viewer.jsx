"use client";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, CircleCheckBig } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import RoadmapCanvas from "../../_components/roadmap-canvas";
import { updateCompletedSteps } from "@/actions/roadmap";
import SkillReviewModal from "../../_components/skill-review-modal";

export default function RoadmapViewer({ roadmap }) {
  const [completedSteps, setCompletedSteps] = useState(
    new Set(Array.isArray(roadmap.completedSteps) ? roadmap.completedSteps : [])
  );

  // Map<nodeId, rawTitle> — steps completed this session, not yet synced
  const [pendingSkills, setPendingSkills] = useState(new Map());
  const [modalOpen,     setModalOpen]     = useState(false);

  const nodes = Array.isArray(roadmap.roadmapNodes) ? roadmap.roadmapNodes : [];

  // O(1) nodeId → node lookup
  const nodeMap = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes]
  );

  const stepNodes    = nodes.filter((n) => n.isStep);
  const completionPct =
    stepNodes.length > 0
      ? Math.round((completedSteps.size / stepNodes.length) * 100)
      : 0;

  /* ── Toggle step + maintain pending queue ─────────────────────────────── */
  const handleToggleStep = useCallback(
    async (nodeId, completed) => {
      const next = new Set(completedSteps);
      if (completed) { next.add(nodeId); } else { next.delete(nodeId); }
      setCompletedSteps(next);

      setPendingSkills((prev) => {
        const updated = new Map(prev);
        if (completed) {
          const node = nodeMap.get(nodeId);
          if (node?.isStep && node.title) updated.set(nodeId, node.title);
        } else {
          updated.delete(nodeId);
        }
        return updated;
      });

      const result = await updateCompletedSteps(roadmap.id, [...next]);
      if (!result.success) {
        setCompletedSteps(completedSteps);
        toast.error("Failed to save progress");
      }
    },
    [completedSteps, nodeMap, roadmap.id]
  );

  const rawTitles = Array.from(pendingSkills.values());

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -mt-8 -mb-20 -mx-4 sm:-mx-6 lg:-mx-8">
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

        <div className="flex items-center gap-3">
          {/* Open review modal — visible when queue is non-empty */}
          {pendingSkills.size > 0 && (
            <Button
              size="sm"
              onClick={() => setModalOpen(true)}
              className="gap-2 h-8 text-xs font-semibold border border-white-500/30 bg-violet-500/10 text-white-300 hover:bg-violet-500/20 hover:text-violet-200 transition-all"
            >
              <CircleCheckBig className="h-3 w-3" />
              Add {pendingSkills.size} skill{pendingSkills.size === 1 ? "" : "s"} to profile
            </Button>
          )}

          {/* Progress bar */}
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
            <span
              className="text-xs font-semibold"
              style={{ color: completionPct === 100 ? "#4ade80" : "#a78bfa" }}
            >
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

      {/* Skill review modal */}
      <SkillReviewModal
        open={modalOpen}
        rawTitles={rawTitles}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setPendingSkills(new Map()); // clear queue after save
          setModalOpen(false);
        }}
      />
    </div>
  );
}
