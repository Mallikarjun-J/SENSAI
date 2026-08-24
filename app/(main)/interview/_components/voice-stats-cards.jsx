import { Mic, Star, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VoiceStatsCards({ feedbacks = [] }) {
  const completed = feedbacks.length;

  const avgScore = completed
    ? (feedbacks.reduce((sum, f) => sum + (f.totalScore ?? 0), 0) / completed).toFixed(1)
    : 0;

  const latestScore = completed
    ? feedbacks[feedbacks.length - 1]?.totalScore ?? 0
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border border-white/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Average Score</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgScore}/100</div>
          <p className="text-xs text-muted-foreground">Across all interviews</p>
        </CardContent>
      </Card>

      <Card className="border border-white/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Interviews Completed</CardTitle>
          <Mic className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completed}</div>
          <p className="text-xs text-muted-foreground">Total sessions with feedback</p>
        </CardContent>
      </Card>

      <Card className="border border-white/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Latest Score</CardTitle>
          <Star className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{latestScore}/100</div>
          <p className="text-xs text-muted-foreground">Most recent voice interview</p>
        </CardContent>
      </Card>
    </div>
  );
}
