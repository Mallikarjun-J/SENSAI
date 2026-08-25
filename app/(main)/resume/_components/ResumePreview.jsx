"use client";
import { useRef, useEffect, useState } from "react";
import { ClassicTemplate } from "../_templates/ClassicTemplate";
import { ModernTemplate } from "../_templates/ModernTemplate";
import { MinimalTemplate } from "../_templates/MinimalTemplate";

const A4_W = 794;
const A4_H = 1123;
const PADDING = 36;

export function ResumePreview({ data }) {
  const Template =
    data.template === "modern"
      ? ModernTemplate
      : data.template === "minimal"
        ? MinimalTemplate
        : ClassicTemplate;

  const wrapperRef = useRef(null);
  const [panelScale, setPanelScale] = useState(1);

  // Apply the user's chosen font size directly — no auto-shrink in preview.
  // Guard: legacy scale values (≤ 2) are treated as default 10.5pt.
  const fontSize = (data.fontScale && data.fontScale > 2) ? data.fontScale : 10.5;

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth || A4_W;
      setPanelScale(Math.min(1, w / A4_W));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} className="w-full" style={{ height: A4_H * panelScale }}>
      <div
        id="resume-print-root"
        style={{
          width: A4_W,
          height: A4_H,
          transformOrigin: "top left",
          transform: `scale(${panelScale})`,
          background: "white",
          boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
          overflow: "hidden",
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        <div
          data-content
          style={{
            width: "100%",
            padding: PADDING,
            fontSize: `${fontSize}pt`,
            lineHeight: 1.35,
            boxSizing: "border-box",
            textAlign: "justify",
            "--accent": data.ascentColor ?? "#a78bfa",
          }}
        >
          <Template data={data} />
        </div>
      </div>
    </div>
  );
}
