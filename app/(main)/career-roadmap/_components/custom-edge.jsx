"use client";
import React from "react";
import { getBezierPath, EdgeLabelRenderer } from "@xyflow/react";

const THEME = { primary: "#a78bfa", secondary: "#8b5cf6" };

const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}) => {
  const isBranch = data?.isBranch;
  const isTrunk = data?.isTrunk;
  const isLeftBranch = data?.isLeftBranch;
  const edgeColor = isTrunk ? THEME.primary : THEME.secondary;

  let edgePath, labelX, labelY;

  if (isBranch) {
    const controlX1 = isLeftBranch ? sourceX - 80 : sourceX + 80;
    const controlX2 = isLeftBranch ? targetX + 80 : targetX - 80;
    edgePath = `M ${sourceX} ${sourceY} C ${controlX1} ${sourceY}, ${controlX2} ${targetY}, ${targetX} ${targetY}`;
    labelX = sourceX + (targetX - sourceX) * 0.5;
    labelY = sourceY + (targetY - sourceY) * 0.5;
  } else {
    [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
  }

  const strokeWidth = isTrunk ? 6 : 4;

  return (
    <>
      <defs>
        <linearGradient id={`gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={edgeColor} stopOpacity="0.9" />
          <stop offset="100%" stopColor={edgeColor} stopOpacity="0.7" />
        </linearGradient>
        <filter id={`glow-${id}`}>
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Glow halo */}
      <path
        style={{
          stroke: edgeColor,
          strokeWidth: strokeWidth + 4,
          fill: "none",
          opacity: 0.4,
          filter: `url(#glow-${id})`,
        }}
        d={edgePath}
      />

      {/* Main edge */}
      <path
        id={id}
        style={{
          stroke: `url(#gradient-${id})`,
          strokeWidth,
          fill: "none",
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />

      {/* Animated dash overlay on trunk */}
      {isTrunk && (
        <path
          style={{
            stroke: THEME.primary,
            strokeWidth: 2.5,
            fill: "none",
            strokeDasharray: "8, 16",
            opacity: 0.9,
          }}
          d={edgePath}
        />
      )}

      {/* Animated travelling dot — branch */}
      {isBranch && (
        <circle r="4" fill="#ffffff" style={{ filter: `drop-shadow(0 0 5px ${edgeColor})`, opacity: 0.9 }}>
          <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}

      {/* Animated travelling dot — trunk */}
      {isTrunk && (
        <circle r="5" fill="#ffffff" style={{ filter: `drop-shadow(0 0 6px ${THEME.primary})`, opacity: 0.9 }}>
          <animateMotion dur="3s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}

      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        />
      </EdgeLabelRenderer>
    </>
  );
};

export default CustomEdge;
