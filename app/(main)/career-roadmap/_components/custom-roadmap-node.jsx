"use client";
import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Target, CheckCircle, CheckCircle2 } from "lucide-react";

const THEME = {
  primary: "#a78bfa",
  secondary: "#8b5cf6",
};

const CustomRoadmapNode = ({ data: rawData }) => {
  const data = rawData;
  const isPhase = data.isPhase;
  const isStep = data.isStep;
  const isPhaseComplete =
    isPhase &&
    Array.isArray(data.connections) &&
    data.connections.length > 0 &&
    data.connections.every((stepId) => data.completedSteps?.has(stepId));
  const isDone = isStep && (data.completedSteps?.has(data.id) ?? false);

  const handleClick = () => data.onNodeClick(data);

  if (isPhase) {
    return (
      <div className="relative group">
        {data.phaseNumber && data.phaseNumber > 1 && (
          <Handle
            type="target"
            position={Position.Top}
            style={{
              background: isPhaseComplete ? "#4ade80" : THEME.primary,
              width: 14,
              height: 14,
              border: "2px solid #ffffff",
              boxShadow: `0 0 8px ${isPhaseComplete ? "#4ade80" : THEME.primary}`,
            }}
          />
        )}
        <Handle
          type="source"
          position={Position.Left}
          id="left"
          style={{
            background: isPhaseComplete ? "#22c55e" : THEME.secondary,
            width: 12,
            height: 12,
            border: "2px solid #ffffff",
            boxShadow: `0 0 6px ${isPhaseComplete ? "#22c55e" : THEME.secondary}`,
            left: -6,
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          style={{
            background: isPhaseComplete ? "#22c55e" : THEME.secondary,
            width: 12,
            height: 12,
            border: "2px solid #ffffff",
            boxShadow: `0 0 6px ${isPhaseComplete ? "#22c55e" : THEME.secondary}`,
            right: -6,
          }}
        />

        <div
          onClick={handleClick}
          className="relative rounded-2xl border-2 hover:scale-[1.025] hover:-translate-y-1 transition-all duration-300 cursor-pointer w-80 h-36"
          style={{
            background: "rgba(26, 28, 32, 0.95)",
            borderColor: isPhaseComplete ? "rgba(34,197,94,0.45)" : THEME.primary + "70",
            boxShadow: isPhaseComplete
              ? "0 0 28px rgba(34,197,94,0.12)"
              : `0 0 28px ${THEME.primary}18`,
          }}
        >
          <div className="p-6 h-full flex items-center justify-start text-white">
            <div className="flex items-center space-x-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center border"
                style={{
                  backgroundColor: isPhaseComplete ? "rgba(34,197,94,0.12)" : `${THEME.primary}15`,
                  borderColor: isPhaseComplete ? "rgba(34,197,94,0.3)" : `${THEME.primary}35`,
                  color: isPhaseComplete ? "#4ade80" : THEME.primary,
                  boxShadow: isPhaseComplete
                    ? "0 0 12px rgba(34,197,94,0.1)"
                    : `0 0 12px ${THEME.primary}12`,
                }}
              >
                {isPhaseComplete ? (
                  <CheckCircle2 className="w-7 h-7" />
                ) : (
                  <Target className="w-7 h-7" />
                )}
              </div>
              <div className="text-left">
                <p
                  className="text-xs font-semibold tracking-wider uppercase"
                  style={{ color: isPhaseComplete ? "#4ade80" : THEME.primary }}
                >
                  Phase {data.phaseNumber}
                </p>
                <h3 className="font-bold text-xl leading-tight text-white">
                  {data.title}
                </h3>
              </div>
            </div>
          </div>
          <div
            className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl"
            style={{
              background: "#1a1c20",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            {isPhaseComplete ? "Phase complete!" : "Click to explore"}
          </div>
        </div>

        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          style={{
            background: isPhaseComplete ? "#4ade80" : THEME.primary,
            width: 14,
            height: 14,
            border: "2px solid #ffffff",
            boxShadow: `0 0 8px ${isPhaseComplete ? "#4ade80" : THEME.primary}`,
          }}
        />
      </div>
    );
  }

  if (isStep) {
    return (
      <div className="relative group">
        <Handle
          type="target"
          position={data.isLeft ? Position.Right : Position.Left}
          style={{
            background: THEME.secondary,
            width: 10,
            height: 10,
            border: "2px solid #ffffff",
            boxShadow: `0 0 6px ${THEME.secondary}`,
            ...(data.isLeft ? { right: -5 } : { left: -5 }),
          }}
        />

        <div
          onClick={handleClick}
          className="relative rounded-xl border transition-all duration-300 cursor-pointer w-56 h-32 flex flex-col overflow-hidden"
          style={
            isDone
              ? {
                  background: "rgba(26, 28, 32, 0.95)",
                  borderColor: "rgba(34,197,94,0.45)",
                  boxShadow: "0 0 18px rgba(34,197,94,0.1)",
                }
              : {
                  background: "rgba(26, 28, 32, 0.95)",
                  borderColor: THEME.secondary + "60",
                  boxShadow: `0 0 16px ${THEME.secondary}12`,
                }
          }
        >
          <div
            className="flex items-center justify-between px-3.5 py-2"
            style={{
              background: "rgba(255,255,255,0.03)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex items-center space-x-2">
              {isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#4ade80" }} />
              ) : (
                <CheckCircle className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
              )}
              <span
                className="font-semibold text-xs tracking-wider uppercase"
                style={{ color: isDone ? "#4ade80" : THEME.primary }}
              >
                Step {data.stepNumber}
              </span>
            </div>
            {isDone ? (
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{
                  background: "rgba(34,197,94,0.15)",
                  border: "1px solid rgba(34,197,94,0.35)",
                }}
              >
                <CheckCircle2 className="w-3 h-3" style={{ color: "#4ade80" }} />
              </div>
            ) : (
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border"
                style={{
                  backgroundColor: `${THEME.secondary}15`,
                  borderColor: `${THEME.secondary}35`,
                  color: THEME.primary,
                }}
              >
                {data.stepNumber}
              </div>
            )}
          </div>

          <div className="p-4 flex-1 flex items-center justify-center">
            <h4
              className="font-semibold text-sm leading-snug text-center"
              style={{ color: isDone ? "rgba(250,250,250,0.45)" : "rgba(255,255,255,0.8)" }}
            >
              {data.title}
            </h4>
          </div>

          <div
            className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl"
            style={{
              background: "#1a1c20",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            Click to explore
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default memo(CustomRoadmapNode);
