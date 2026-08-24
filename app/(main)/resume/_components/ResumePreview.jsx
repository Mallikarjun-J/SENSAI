"use client";
import { useRef, useEffect, useState } from "react";
import { ClassicTemplate } from "../_templates/ClassicTemplate";
import { ModernTemplate } from "../_templates/ModernTemplate";
import { MinimalTemplate } from "../_templates/MinimalTemplate";

const A4_W = 794;
const A4_H = 1123;
const BASE_FONT = 10.5;
const PADDING = 36;
const BOTTOM_BUFFER = 36;

export function ResumePreview({ data }) {
  const Template =
    data.template === "modern"
      ? ModernTemplate
      : data.template === "minimal"
        ? MinimalTemplate
        : ClassicTemplate;

  const wrapperRef = useRef(null);
  const contentRef = useRef(null);
  const needsMeasure = useRef(true);

  const [panelScale, setPanelScale] = useState(1);
  const [fontSize, setFontSize] = useState(BASE_FONT);

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

  useEffect(() => {
    needsMeasure.current = true;
    setFontSize(BASE_FONT);
  }, [data]);

  useEffect(() => {
    if (!needsMeasure.current) return;
    needsMeasure.current = false;
    const el = contentRef.current;
    if (!el) return;
    const naturalH = el.scrollHeight;
    const targetH = A4_H - PADDING - BOTTOM_BUFFER;
    if (naturalH > targetH) {
      const ratio = targetH / naturalH;
      setFontSize(Math.max(7, parseFloat((BASE_FONT * ratio).toFixed(2))));
    }
  }, [fontSize]);

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
          ref={contentRef}
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
