"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Plus,
  X,
  BookOpen,
  BarChart3,
  Code2,
  FileQuestion,
  Sparkles,
} from "lucide-react";

const TOPIC_SUGGESTIONS = [
  "JavaScript", "TypeScript", "React", "Next.js", "Node.js",
  "Python", "Java", "C++", "Go", "Rust",
  "System Design", "Data Structures & Algorithms", "SQL & Databases",
  "Machine Learning", "DevOps & CI/CD", "REST APIs",
  "Computer Networks", "Operating Systems", "Cloud (AWS/GCP/Azure)",
  "Docker & Kubernetes",
];

const SUBTOPIC_SUGGESTIONS = [
  "Closures", "Promises & Async/Await", "Event Loop", "Hoisting",
  "Prototypes", "React Hooks", "State Management", "Memoization",
  "Big O Notation", "Arrays", "Linked Lists", "Trees & Graphs",
  "Dynamic Programming", "Sorting Algorithms", "Recursion",
  "SQL Joins", "Indexing", "Transactions", "Normalization",
  "REST vs GraphQL", "JWT Auth", "Caching", "Load Balancing",
];

const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const TYPES = ["Technical", "Conceptual", "Mixed"];

export default function MockQuizForm({
  defaultTopic = "",
  defaultTopics = [],
  onGenerate,
}) {
  const [topic, setTopic] = useState(defaultTopic);
  const [difficulty, setDifficulty] = useState("Medium");
  const [type, setType] = useState("Mixed");
  const [subtopicInput, setSubtopicInput] = useState("");
  const [topics, setTopics] = useState(defaultTopics);
  const [questionCount, setQuestionCount] = useState(10);
  const [showTopicSuggestions, setShowTopicSuggestions] = useState(false);
  const [showSubtopicSuggestions, setShowSubtopicSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  const filteredTopics = TOPIC_SUGGESTIONS.filter(
    (t) =>
      t.toLowerCase().includes(topic.toLowerCase()) &&
      t.toLowerCase() !== topic.toLowerCase()
  );

  const filteredSubtopics = SUBTOPIC_SUGGESTIONS.filter(
    (s) =>
      s.toLowerCase().includes(subtopicInput.toLowerCase()) &&
      !topics.map((t) => t.toLowerCase()).includes(s.toLowerCase())
  );

  const addSubtopic = (s) => {
    const trimmed = s.trim();
    if (!trimmed) return;
    if (topics.map((t) => t.toLowerCase()).includes(trimmed.toLowerCase())) return;
    setTopics((prev) => [...prev, trimmed]);
    setSubtopicInput("");
    setShowSubtopicSuggestions(false);
  };

  const removeSubtopic = (s) =>
    setTopics((prev) => prev.filter((t) => t !== s));

  const handleSubtopicKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSubtopic(subtopicInput);
    }
    if (e.key === "Backspace" && !subtopicInput && topics.length > 0) {
      setTopics((prev) => prev.slice(0, -1));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!topic.trim()) {
      alert("Please enter a subject or topic.");
      return;
    }
    setLoading(true);
    await onGenerate({ topic: topic.trim(), difficulty, type, topics, questionCount });
    setLoading(false);
  };

  return (
    <div className="w-full flex items-start justify-center px-0 py-2">
      <div className="w-full max-w-3xl">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#1A1C20] to-[#08090D]">
          <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-7">

            {/* Subject / Topic */}
            <div className="relative flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-white">
                <BookOpen className="h-4 w-4 text-primary" />
                Subject / Topic
                <span className="text-red-400">*</span>
                {defaultTopic && (
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    pre-filled from your profile
                  </span>
                )}
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => { setTopic(e.target.value); setShowTopicSuggestions(true); }}
                onFocus={() => setShowTopicSuggestions(true)}
                onBlur={() => setTimeout(() => setShowTopicSuggestions(false), 150)}
                placeholder="e.g. JavaScript, System Design, React…"
                className="rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 outline-none px-4 py-3 text-white text-sm placeholder:text-muted-foreground transition-colors w-full"
                autoComplete="off"
              />
              {showTopicSuggestions && filteredTopics.length > 0 && topic.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl border border-white/10 overflow-hidden bg-[#1A1C20] shadow-xl">
                  {filteredTopics.slice(0, 6).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onMouseDown={() => { setTopic(t); setShowTopicSuggestions(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
              {/* Quick pick chips when input is empty */}
              {topic.length === 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {TOPIC_SUGGESTIONS.slice(0, 8).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTopic(t)}
                      className="px-3 py-1 rounded-full bg-white/5 text-muted-foreground text-xs hover:text-white hover:bg-white/10 transition-colors border border-white/10 cursor-pointer"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Difficulty */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-white">
                <BarChart3 className="h-4 w-4 text-primary" />
                Difficulty
              </label>
              <div className="flex flex-wrap gap-3">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`px-6 py-2 rounded-full text-sm font-semibold transition-all border cursor-pointer ${
                      difficulty === d
                        ? d === "Easy"
                          ? "bg-green-600 text-white border-green-500 shadow-md"
                          : d === "Hard"
                          ? "bg-red-600 text-white border-red-500 shadow-md"
                          : "bg-primary text-primary-foreground border-primary shadow-md"
                        : "bg-white/5 text-muted-foreground border-white/10 hover:border-primary/30 hover:text-white"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {difficulty === "Easy"
                  ? "Beginner-friendly — great for revision and fundamentals."
                  : difficulty === "Hard"
                  ? "Expert-level — deep knowledge and edge cases required."
                  : "Balanced — suitable for candidates with working experience."}
              </p>
            </div>

            {/* Quiz Type */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-white">
                <Code2 className="h-4 w-4 text-primary" />
                Quiz Type
              </label>
              <div className="flex flex-wrap gap-3">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`px-6 py-2 rounded-full text-sm font-semibold transition-all border cursor-pointer ${
                      type === t
                        ? "bg-primary text-primary-foreground border-primary shadow-md"
                        : "bg-white/5 text-muted-foreground border-white/10 hover:border-primary/30 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {type === "Technical"
                  ? "Code, tools, algorithms and implementation details."
                  : type === "Conceptual"
                  ? "Theory, principles and how things work under the hood."
                  : "A 50/50 mix of technical and conceptual questions."}
              </p>
            </div>

            {/* Specific Sub-topics (optional) */}
            <div className="relative flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-white">
                <Sparkles className="h-4 w-4 text-primary" />
                Specific Sub-topics
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <div className="min-h-12 bg-white/5 rounded-xl px-4 py-2 flex flex-wrap gap-2 items-center border border-white/10 focus-within:border-primary/50 transition-colors">
                {topics.map((s) => (
                  <span
                    key={s}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => removeSubtopic(s)}
                      className="hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={subtopicInput}
                  onChange={(e) => { setSubtopicInput(e.target.value); setShowSubtopicSuggestions(true); }}
                  onFocus={() => setShowSubtopicSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSubtopicSuggestions(false), 150)}
                  onKeyDown={handleSubtopicKeyDown}
                  placeholder={topics.length === 0 ? "Type a subtopic and press Enter…" : "Add more…"}
                  className="flex-1 min-w-[160px] bg-transparent outline-none text-white text-sm placeholder:text-muted-foreground"
                />
              </div>

              {showSubtopicSuggestions && filteredSubtopics.length > 0 && subtopicInput.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl border border-white/10 overflow-hidden bg-[#1A1C20] shadow-xl">
                  {filteredSubtopics.slice(0, 6).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={() => addSubtopic(s)}
                      className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="h-3 w-3 text-primary" />
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {topics.length === 0 && subtopicInput.length === 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {SUBTOPIC_SUGGESTIONS.slice(0, 8).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addSubtopic(s)}
                      className="px-3 py-1 rounded-full bg-white/5 text-muted-foreground text-xs hover:text-white hover:bg-white/10 transition-colors border border-white/10 cursor-pointer"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Number of Questions */}
            <div className="flex flex-col gap-3">
              <label className="flex items-center justify-between text-sm font-medium text-white">
                <span className="flex items-center gap-2">
                  <FileQuestion className="h-4 w-4 text-primary" />
                  Number of Questions
                </span>
                <span className="text-primary font-bold text-base">{questionCount}</span>
              </label>
              <input
                type="range"
                min={5}
                max={20}
                step={1}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary"
                style={{
                  background: `linear-gradient(to right, hsl(var(--primary)) ${
                    ((questionCount - 5) / 15) * 100
                  }%, rgba(255,255,255,0.1) ${((questionCount - 5) / 15) * 100}%)`,
                }}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5</span>
                <span>12</span>
                <span>20</span>
              </div>
            </div>

            <div className="border-t border-white/10" />

            <Button
              type="submit"
              disabled={loading}
              className="w-full min-h-12 font-bold text-base cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating {questionCount} Questions…
                </>
              ) : (
                <>Generate &amp; Start Quiz</>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              AI will craft {questionCount} tailored MCQ questions on{" "}
              <span className="text-white font-medium">{topic || "your chosen topic"}</span>
              {topics.length > 0 && ` · focusing on ${topics.slice(0, 3).join(", ")}${topics.length > 3 ? "…" : ""}`}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
