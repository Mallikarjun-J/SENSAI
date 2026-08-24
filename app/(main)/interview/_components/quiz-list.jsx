"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import QuizResult from "./quiz-result";
import { deleteAssessment } from "@/actions/interview";

export default function QuizList({ assessments }) {
  const router = useRouter();
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handleDeleteQuiz = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Delete this quiz? This action cannot be undone.")) return;
    setDeletingId(id);
    try {
      await deleteAssessment(id);
      toast.success("Quiz deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete quiz");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Card className={'border border-white/20'}>
        <CardHeader>
          <div className="flex items-center justify-between ">
            <div>
              <CardTitle className="gradient-title text-3xl md:text-4xl">
                Recent Quizzes
              </CardTitle>
              <CardDescription>
                Review your past quiz performance
              </CardDescription>
            </div>
            <Button onClick={() => router.push("/interview/mock")}>
              Start New Quiz
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 ">
            {assessments?.map((assessment, i) => (
              <Card
                key={assessment.id}
                className="cursor-pointer hover:bg-muted/80 transition-colors border border-white/20 relative"
                onClick={() => setSelectedQuiz(assessment)}
              >
                {/* Delete button */}
                <button
                  onClick={(e) => handleDeleteQuiz(e, assessment.id)}
                  disabled={deletingId === assessment.id}
                  className="absolute top-3 right-3 w-7 h-7 rounded-md border border-white/10 bg-background flex items-center justify-center text-muted-foreground hover:text-red-400 hover:border-red-500/30 transition-colors z-10"
                  title="Delete quiz"
                >
                  {deletingId === assessment.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />}
                </button>

                <CardHeader>
                  <CardTitle className="gradient-title text-2xl pr-8">
                    Quiz {i + 1}
                  </CardTitle>
                  <CardDescription className="flex justify-between w-full">
                    <div>Score: {assessment.quizScore.toFixed(1)}%</div>
                    <div>
                      {format(
                        new Date(assessment.createdAt),
                        "MMMM dd, yyyy HH:mm"
                      )}
                    </div>
                  </CardDescription>
                </CardHeader>
                {assessment.improvementTip && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {assessment.improvementTip}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedQuiz} onOpenChange={() => setSelectedQuiz(null)} >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-black ">
          <DialogHeader>
            <DialogTitle></DialogTitle>
          </DialogHeader>
          <QuizResult
            result={selectedQuiz}
            hideStartNew
            onStartNew={() => router.push("/interview/mock")}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}