"use client";
import { useState, useEffect } from "react";

export function SkillsForm({ value, onChange }) {
  const [raw, setRaw] = useState(() => (value ?? []).join("\n"));

  useEffect(() => {
    setRaw((value ?? []).join("\n"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (nextRaw) => {
    setRaw(nextRaw);
    onChange(
      nextRaw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Skills</label>
        <textarea
          rows={9}
          value={raw}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={`Languages: Java, Python, C++, JavaScript, TypeScript\nWeb & Frameworks: React, Next.js, Node.js, Express.js, FastAPI\nDatabases: MySQL, PostgreSQL, MongoDB, Prisma ORM\nAI / ML: LLM Integration (Gemini, Mistral), RAG Pipelines\nCore Concepts: Data Structures & Algorithms, OOP, REST APIs`}
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none font-mono"
        />
      </div>
      <div className="rounded-lg border border-dashed border-white/15 p-3 text-xs text-muted-foreground">
        💡 Each non-empty line appears as a separate row on the resume. Use <code className="bg-white/10 px-1 rounded">Category: detail, detail</code> format for best results.
      </div>
    </div>
  );
}
