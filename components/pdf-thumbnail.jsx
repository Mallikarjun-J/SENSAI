"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Loader2, FileText } from "lucide-react";

// Dynamically import react-pdf to avoid any SSR issues
const Document = dynamic(
  () => import("react-pdf").then((mod) => mod.Document),
  { ssr: false }
);

const Page = dynamic(
  () => import("react-pdf").then((mod) => mod.Page),
  { ssr: false }
);

export default function PdfThumbnail({ url, className = "", pageNumber = 1 }) {
  const [mounted, setMounted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [containerWidth, setContainerWidth] = useState(240);
  const containerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    // Configure worker
    import("react-pdf").then(({ pdfjs }) => {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    });

    // Measure container width
    if (containerRef.current) {
      const w = containerRef.current.clientWidth;
      if (w > 0) setContainerWidth(w);
    }
  }, []);

  if (!mounted || !url) {
    return (
      <div ref={containerRef} className={`flex items-center justify-center bg-white/[0.02] ${className}`}>
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div ref={containerRef} className={`flex flex-col items-center justify-center p-4 text-center bg-white/[0.02] ${className}`}>
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-2">
          <FileText className="w-5 h-5 text-purple-400" />
        </div>
        <span className="text-xs font-medium text-white/80">PDF Document</span>
        <span className="text-[11px] text-muted-foreground mt-0.5">Click to view analysis</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden flex items-start justify-center ${className}`}
    >
      <Document
        file={url}
        onLoadError={(err) => {
          console.warn("[PdfThumbnail] Canvas preview fallback:", err?.message || err);
          setHasError(true);
        }}
        loading={
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
        }
        className="w-full flex justify-center"
      >
        <Page
          pageNumber={pageNumber}
          width={containerWidth}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="shadow-sm max-w-full"
        />
      </Document>
    </div>
  );
}
