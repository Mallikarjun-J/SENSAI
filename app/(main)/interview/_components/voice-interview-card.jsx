import dayjs from "dayjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getVoiceFeedbackByInterviewId } from "@/actions/interview";
import { Calendar, Star, Mic } from "lucide-react";
import DisplayTechIcons from "./display-tech-icons";
import DeleteInterviewButton from "./delete-interview-button";

const VoiceInterviewCard = async ({
  interviewId,
  userId,
  role,
  type,
  techstack,
  createdAt,
}) => {
  const feedback =
    userId && interviewId
      ? await getVoiceFeedbackByInterviewId({ interviewId, userId })
      : null;

  const normalizedType = /mix/gi.test(type) ? "Mixed" : type;

  const badgeVariant = {
    Behavioral: "secondary",
    Mixed: "outline",
    Technical: "default",
  }[normalizedType] ?? "outline";

  const formattedDate = dayjs(feedback?.createdAt ?? createdAt).format("MMM D, YYYY");

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#1A1C20] to-[#08090D] p-6 flex flex-col gap-5 justify-between min-h-[320px] w-full relative overflow-hidden hover:border-white/20 transition-colors">
      {/* Type badge */}
      <div className="absolute top-4 right-4">
        <Badge variant={badgeVariant} className="text-xs font-semibold capitalize">
          {normalizedType}
        </Badge>
      </div>

      {/* Icon + Role */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-center rounded-full size-14 bg-gradient-to-l from-white to-primary/60 text-2xl">
          <Mic className="h-6 w-6 text-background" />
        </div>

        <h3 className="capitalize text-white font-semibold text-lg mt-2">
          {role} Interview
        </h3>

        {/* Date & Score */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {formattedDate}
          </span>
          <span className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5" />
            {feedback?.totalScore != null ? `${feedback.totalScore}/100` : "---"}
          </span>
        </div>

        {/* Assessment snippet */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {feedback?.finalAssessment ??
            "You haven't taken this interview yet. Start now to get AI-powered feedback."}
        </p>
      </div>

      {/* Footer: tech icons + delete + CTA */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <DisplayTechIcons techStack={techstack} />
          <DeleteInterviewButton interviewId={interviewId} role={role} />
        </div>
        <Button size="sm" asChild className="shrink-0">
          <Link
            href={
              feedback
                ? `/interview/voice/${interviewId}/feedback`
                : `/interview/voice/${interviewId}`
            }
          >
            {feedback ? "View Feedback" : "Start Interview"}
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default VoiceInterviewCard;
