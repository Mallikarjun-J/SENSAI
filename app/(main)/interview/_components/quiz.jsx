"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { generateQuiz, saveQuizResult } from "@/actions/interview";
import useFetch from "@/hooks/use-fetch";
import { BarLoader } from "react-spinners";
import { Loader2 } from "lucide-react";
import QuizResult from "./quiz-result";
import { formatPlainText } from "@/lib/utils";


export default function Quiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [showExplanation, setShowExplanation] = useState(false);

  const {
    loading: generatingQuiz,
    fn: generateQuizFn,
    data: quizData,
  } = useFetch(generateQuiz);

  const {
    loading: savingResult,
    fn: saveQuizResultFn,
    data: resultData,
    setData: setResultData,
  } = useFetch(saveQuizResult);



  useEffect(() => {
    if (quizData) {
      setAnswers(new Array(quizData.length).fill(null));
    }
  }, [quizData]);

  const handleAnswer = (answer) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answer;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < quizData.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setShowExplanation(false);
    } else {
      finishQuiz();
    }
  };

  const calculateScore = () => {
    let correct = 0;
    answers.forEach((answer, index) => {
      if (answer === quizData[index].correctAnswer) {
        correct++;
      }
    });
    return (correct / quizData.length) * 100;
  };

  const finishQuiz = async () => {
    const score = calculateScore();
    try {
      await saveQuizResultFn(quizData, answers, score);

      toast.success("Quiz completed!");
    } catch (error) {
      toast.error(error.message || "Failed to save quiz results");
    }
  };

  const startNewQuiz = () => {
    setCurrentQuestion(0);
    setAnswers([]);
    setShowExplanation(false);
    generateQuizFn();
    setResultData(null);
  };

  if (generatingQuiz) {
    return <BarLoader className="mt-4" width={"100%"} color="gray" />;
  }

  // Show results if quiz is completed
  if (resultData) {
    return (
      <div className="w-full max-w-4xl lg:max-w-5xl mx-auto space-y-6">
        <QuizResult result={resultData} onStartNew={startNewQuiz} />
      </div>
    );
  }

  if (!quizData) {
    return (
      <Card className="w-full max-w-4xl lg:max-w-5xl mx-auto border border-white/10 bg-gradient-to-b from-[#1A1C20] to-[#08090D] shadow-xl">
        <CardHeader className="p-6 sm:p-8 border-b border-white/10">
          <CardTitle className="text-xl sm:text-2xl font-bold text-white">
            Ready to test your knowledge?
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 sm:p-8 space-y-4">
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            This quiz contains 10 questions specific to your industry and
            skills. Take your time and choose the best answer for each question.
          </p>
        </CardContent>
        <CardFooter className="p-6 sm:p-8 pt-0">
          <Button onClick={generateQuizFn} className="w-full sm:w-auto font-semibold">
            Start Quiz
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const question = quizData[currentQuestion];

  return (
    <Card className="w-full max-w-4xl lg:max-w-5xl mx-auto border border-white/10 bg-gradient-to-b from-[#1A1C20] to-[#08090D] shadow-xl">
      <CardHeader className="p-5 sm:p-7 pb-3 sm:pb-4 border-b border-white/10">
        <CardTitle className="text-base sm:text-lg font-bold text-white">
          Question {currentQuestion + 1}{" "}
          <span className="text-muted-foreground font-normal text-sm sm:text-base">
            of {quizData.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 sm:p-7 space-y-6">
        <p className="text-base sm:text-lg md:text-xl font-medium text-white leading-relaxed whitespace-pre-line">
          {formatPlainText(question.question)}
        </p>
        <RadioGroup
          onValueChange={handleAnswer}
          value={answers[currentQuestion]}
          className="space-y-3"
        >
          {question.options.map((option, index) => {
            const isSelected = answers[currentQuestion] === option;
            return (
              <label
                key={index}
                htmlFor={`option-${index}`}
                className={`flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary/10 border-primary shadow-sm"
                    : "bg-white/[0.02] border-white/10 hover:border-primary/40 hover:bg-white/[0.04]"
                }`}
              >
                <RadioGroupItem
                  value={option}
                  id={`option-${index}`}
                  className="mt-1 shrink-0"
                />
                <span className="text-sm sm:text-base font-medium text-zinc-100 flex-1 leading-relaxed">
                  {formatPlainText(option)}
                </span>
              </label>
            );
          })}
        </RadioGroup>

        {showExplanation && (
          <div className="mt-4 p-4 sm:p-5 bg-zinc-900/70 border border-white/10 rounded-xl space-y-1.5">
            <p className="font-semibold text-sm text-primary">Explanation:</p>
            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed whitespace-pre-line">
              {formatPlainText(question.explanation)}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-5 sm:p-7 pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-white/10">
        {!showExplanation ? (
          <Button
            onClick={() => setShowExplanation(true)}
            variant="outline"
            disabled={!answers[currentQuestion]}
            className="w-full sm:w-auto"
          >
            Show Explanation
          </Button>
        ) : (
          <div className="hidden sm:block" />
        )}
        <Button
          onClick={handleNext}
          disabled={!answers[currentQuestion] || savingResult}
          className="w-full sm:w-auto ml-auto font-semibold"
        >
          {savingResult && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {currentQuestion < quizData.length - 1
            ? "Next Question"
            : "Finish Quiz"}
        </Button>
      </CardFooter>
    </Card>
  );
}