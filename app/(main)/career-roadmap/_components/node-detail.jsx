"use client";
import { useState } from "react";
import {
  X,
  ExternalLink,
  Play,
  Search,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";

export default function NodeDetail({ node, onClose, isCompleted = false, onToggleComplete }) {
  const [instructions, setInstructions] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);

  const loadInstructions = async () => {
    if (instructions.length || loadingAI) return;
    setLoadingAI(true);
    try {
      const res = await fetch("/api/roadmap/instructions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: node.description }),
      });
      const data = await res.json();
      if (data.instructions) setInstructions(data.instructions);
    } catch {
      /* silent */
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="absolute inset-0 flex items-end sm:items-start justify-center sm:justify-end p-4 pointer-events-none z-10">
      <div
        className="pointer-events-auto w-full sm:w-96 max-h-[85vh] flex flex-col rounded-2xl shadow-2xl shadow-black/60 overflow-hidden animate-in slide-in-from-right-4 duration-300"
        style={{
          background: "rgba(15, 15, 20, 0.97)",
          border: "1px solid rgba(167,139,250,0.15)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between p-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex-1 mr-3">
            {node.isPhase && (
              <p className="text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: "rgba(167,139,250,0.8)" }}>
                Phase {node.phaseNumber}
              </p>
            )}
            {node.isStep && (
              <p className="text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: "rgba(167,139,250,0.55)" }}>
                Step {node.stepNumber}
              </p>
            )}
            <h3 className="font-bold text-lg leading-tight text-white">{node.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0 text-white/40 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mark complete — steps only */}
        {node.isStep && onToggleComplete && (
          <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              onClick={() => onToggleComplete(node.id, !isCompleted)}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all"
              style={
                isCompleted
                  ? {
                      background: "rgba(34,197,94,0.12)",
                      border: "1px solid rgba(34,197,94,0.3)",
                      color: "#4ade80",
                    }
                  : {
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.6)",
                    }
              }
            >
              {isCompleted ? (
                <><CheckCircle2 className="w-4 h-4" /> Completed — click to undo</>
              ) : (
                <><Circle className="w-4 h-4" /> Mark as Complete</>
              )}
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* AI Summary */}
          {node.resources?.aiSummary && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-3.5 h-3.5 text-white/30" />
                <p className="text-xs font-semibold uppercase tracking-wider text-white/30">
                  Summary
                </p>
              </div>
              <p className="text-sm leading-relaxed text-white/60">
                {node.resources.aiSummary}
              </p>
            </div>
          )}

          {/* AI Instructions */}
          {node.isStep && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" style={{ color: "rgba(167,139,250,0.7)" }} />
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/30">
                    AI Instructions
                  </p>
                </div>
                {!instructions.length && (
                  <button
                    onClick={loadInstructions}
                    disabled={loadingAI}
                    className="text-xs font-medium disabled:opacity-60 flex items-center gap-1 hover:underline"
                    style={{ color: "rgba(167,139,250,0.8)" }}
                  >
                    {loadingAI ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Loading...</>
                    ) : (
                      "Generate"
                    )}
                  </button>
                )}
              </div>
              {instructions.length > 0 && (
                <ol className="space-y-2">
                  {instructions.map((ins, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-white/60">
                      <span
                        className="font-bold text-xs mt-0.5 flex-shrink-0"
                        style={{ color: "rgba(167,139,250,0.7)" }}
                      >
                        {i + 1}.
                      </span>
                      <span className="leading-relaxed">{ins}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {/* YouTube Videos */}
          {node.resources?.youtubeVideos?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Play className="w-3.5 h-3.5 text-red-400" />
                <p className="text-xs font-semibold uppercase tracking-wider text-white/30">
                  Video Resources
                </p>
              </div>
              <div className="space-y-2.5">
                {node.resources.youtubeVideos.map((vid, i) => (
                  <a
                    key={i}
                    href={vid.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2.5 rounded-xl transition-all hover:border-white/10 group"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <img
                      src={vid.thumbnail}
                      alt={vid.title}
                      className="w-16 h-12 rounded-lg object-cover flex-shrink-0"
                      style={{ background: "#1a1c20" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-2 text-white/60 group-hover:text-white/80 transition-colors">
                        {vid.title}
                      </p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 text-white/20" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {node.resources?.searchResults?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-3.5 h-3.5 text-white/30" />
                <p className="text-xs font-semibold uppercase tracking-wider text-white/30">
                  Search Resources
                </p>
              </div>
              <div className="space-y-2">
                {node.resources.searchResults.map((r, i) => (
                  <a
                    key={i}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl transition-all hover:border-white/10 group"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <span className="text-xs font-medium text-white/60 group-hover:text-white/80 transition-colors">
                      {r.title}
                    </span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0 ml-2 text-white/20" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
