"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, RotateCcw, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateQuiz, saveQuizResult } from "@/actions/interview";
import MockQuizForm from "./mock-quiz-form";
import QuizResult from "./quiz-result";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// States: "setup" | "generating" | "quiz" | "saving" | "result"

export default function MockQuizWrapper({ defaultTopic = "", defaultTopics = [] }) {
  const [stage, setStage] = useState("setup");
  const [config, setConfig] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  // ── Form submit → generate ──────────────────────────────────────────────────
  const handleGenerate = async (formConfig) => {
    setConfig(formConfig);
    setStage("generating");
    try {
      const qs = await generateQuiz(formConfig);
      if (!qs || qs.length === 0) {
        toast.error("No questions were generated. Please try again.");
        setStage("setup");
        return;
      }
      setQuestions(qs);
      setAnswers(new Array(qs.length).fill(null));
      setCurrentQuestion(0);
      setShowExplanation(false);
      setStage("quiz");
    } catch (err) {
      toast.error(err?.message || "Failed to generate questions. Please try again.");
      setStage("setup");
    }
  };

  // ── Quiz interactions ───────────────────────────────────────────────────────
  const handleAnswer = (answer) => {
    const updated = [...answers];
    updated[currentQuestion] = answer;
    setAnswers(updated);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setShowExplanation(false);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    const score =
      (answers.filter((a, i) => a === questions[i].correctAnswer).length /
        questions.length) *
      100;
    setSaving(true);
    setStage("saving");
    try {
      const res = await saveQuizResult(questions, answers, score);
      setResult(res);
      setStage("result");
      toast.success("Quiz completed!");
    } catch (err) {
      toast.error(err?.message || "Failed to save quiz results.");
      setStage("quiz"); // keep quiz visible so user doesn't lose answers
    } finally {
      setSaving(false);
    }
  };

  // ── Restart with same config ────────────────────────────────────────────────
  const handleRetry = () => {
    setResult(null);
    setQuestions([]);
    setAnswers([]);
    setCurrentQuestion(0);
    setShowExplanation(false);
    setStage("setup");
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  // 1. Setup form
  if (stage === "setup") {
    return (
      <MockQuizForm
        defaultTopic={defaultTopic}
        defaultTopics={defaultTopics}
        onGenerate={handleGenerate}
      />
    );
  }

  // 2. Generating screen
  if (stage === "generating") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[340px] gap-6 text-center">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#1A1C20] to-[#08090D] p-14 flex flex-col items-center gap-5 w-full max-w-md">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <div>
            <p className="text-white font-semibold text-lg">Generating your quiz…</p>
            <p className="text-muted-foreground text-sm mt-1">
              AI is crafting {config?.questionCount ?? 10} tailored questions on{" "}
              <span className="text-white font-medium">{config?.topic}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              config?.difficulty,
              config?.type,
              ...(config?.topics?.slice(0, 3) ?? []),
            ]
              .filter(Boolean)
              .map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/20"
                >
                  {tag}
                </span>
              ))}
          </div>
        </div>
      </div>
    );
  }

  // 3. Quiz screen
  if (stage === "quiz" || stage === "saving") {
    const question = questions[currentQuestion];
    const progress = ((currentQuestion + 1) / questions.length) * 100;

    return (
      <div className="space-y-4">
        {/* Config summary bar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Change Setup
          </button>
          <div className="flex flex-wrap gap-2">
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
              {config?.topic}
            </span>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
              {config?.difficulty}
            </span>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
              {config?.type}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>
                Question {currentQuestion + 1}{" "}
                <span className="text-muted-foreground font-normal">
                  / {questions.length}
                </span>
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {config?.topic} · {config?.difficulty}
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-base font-medium leading-snug">{question.question}</p>
            <RadioGroup
              onValueChange={handleAnswer}
              value={answers[currentQuestion]}
              className="space-y-2"
            >
              {question.options.map((option, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                  <RadioGroupItem
                    value={option}
                    id={`opt-${idx}`}
                    className="mt-0.5 shrink-0"
                  />
                  <Label
                    htmlFor={`opt-${idx}`}
                    className="leading-snug cursor-pointer"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {showExplanation && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="font-medium text-sm">Explanation:</p>
                <p className="text-muted-foreground text-sm mt-1">
                  {question.explanation}
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between gap-3">
            {!showExplanation && (
              <Button
                onClick={() => setShowExplanation(true)}
                variant="outline"
                disabled={!answers[currentQuestion]}
              >
                Show Explanation
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={!answers[currentQuestion] || saving}
              className="ml-auto"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {currentQuestion < questions.length - 1 ? "Next Question" : "Finish Quiz"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // 4. Saving screen
  if (stage === "saving") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[280px] gap-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-muted-foreground text-sm">Saving your results…</p>
      </div>
    );
  }

  // 5. Result screen
  if (stage === "result" && result) {
    return (
      <div className="space-y-4">
        <QuizResult result={result} onStartNew={handleRetry} />
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleRetry}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Try a Different Quiz
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
