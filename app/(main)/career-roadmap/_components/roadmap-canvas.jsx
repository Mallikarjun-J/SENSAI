"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import CustomRoadmapNode from "./custom-roadmap-node";
import CustomEdge from "./custom-edge";
import NodeDetail from "./node-detail";

const nodeTypes = { customNode: CustomRoadmapNode };
const edgeTypes = { customEdge: CustomEdge };

const THEME = { primary: "#a78bfa", secondary: "#8b5cf6" };

export default function RoadmapCanvas({ nodes: rawNodes, completedSteps, onToggleStep }) {
  const [selectedNode, setSelectedNode] = useState(null);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  const flowNodes = useMemo(
    () =>
      rawNodes.map((n) => ({
        id: n.id,
        type: "customNode",
        position: { x: n.x, y: n.y },
        data: { ...n, theme: THEME, onNodeClick: handleNodeClick, completedSteps },
        draggable: false,
      })),
    [rawNodes, handleNodeClick, completedSteps]
  );

  const flowEdges = useMemo(() => {
    const edges = [];
    rawNodes.forEach((n) => {
      if (n.isPhase) {
        const nextPhase = rawNodes.find(
          (p) => p.isPhase && p.phaseNumber === (n.phaseNumber ?? 0) + 1
        );
        if (nextPhase) {
          edges.push({
            id: `trunk-${n.id}-${nextPhase.id}`,
            source: n.id,
            target: nextPhase.id,
            sourceHandle: "bottom",
            type: "customEdge",
            data: { theme: THEME, isTrunk: true },
            animated: false,
          });
        }
        (n.connections || []).forEach((stepId) => {
          const step = rawNodes.find((s) => s.id === stepId);
          if (!step) return;
          edges.push({
            id: `branch-${n.id}-${stepId}`,
            source: n.id,
            target: stepId,
            sourceHandle: step.isLeft ? "left" : "right",
            type: "customEdge",
            data: { theme: THEME, isBranch: true, isLeftBranch: step.isLeft },
            animated: false,
          });
        });
      }
    });
    return edges;
  }, [rawNodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, , onEdgesChange] = useEdgesState(flowEdges);

  // Re-sync ReactFlow internal state whenever completedSteps changes upstream
  useEffect(() => { setNodes(flowNodes); }, [flowNodes]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{ background: "transparent" }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={32}
          size={1}
          color="rgba(167,139,250,0.08)"
        />
        <Controls className="!rounded-xl" />
      </ReactFlow>

      {selectedNode && (
        <NodeDetail
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          isCompleted={completedSteps.has(selectedNode.id)}
          onToggleComplete={onToggleStep}
        />
      )}
    </div>
  );
}
