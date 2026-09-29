"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle } from "lucide-react";

function getBadgeClass(score) {
  if (score >= 80) return "bg-green-500/20 text-green-400 border-green-500/30";
  if (score >= 60) return "bg-lime-500/20 text-lime-400 border-lime-500/30";
  if (score >= 40) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-red-500/20 text-red-400 border-red-500/30";
}

function getBadgeLabel(score) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Average";
  return "Needs Work";
}

export default function ResumeBreakdown({ categories }) {
  if (!categories?.length) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-white">Detailed Breakdown</h2>
      <Tabs defaultValue={categories[0].key}>
        <TabsList className="h-auto flex flex-wrap gap-1 bg-white/[0.03] border border-white/10 p-1 rounded-xl w-full justify-start">
          {categories.map((cat) => (
            <TabsTrigger
              key={cat.key}
              value={cat.key}
              className="rounded-lg text-xs font-medium data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 data-[state=active]:shadow-none text-muted-foreground"
            >
              {cat.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((cat) => {
          const goodTips    = cat.tips.filter((t) => t.type === "good");
          const improveTips = cat.tips.filter((t) => t.type === "improve");

          return (
            <TabsContent key={cat.key} value={cat.key} className="mt-4 space-y-5">
              {/* Score header */}
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-white">
                  {cat.score}
                  <span className="text-sm font-normal text-muted-foreground">/100</span>
                </span>
                <Badge variant="outline" className={getBadgeClass(cat.score)}>
                  {getBadgeLabel(cat.score)}
                </Badge>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                {/* What's Working */}
                {goodTips.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-green-400 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      What&apos;s Working
                    </h4>
                    <ul className="space-y-3">
                      {goodTips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm text-white/75 leading-relaxed">{tip.tip}</p>
                            {tip.explanation && (
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                {tip.explanation}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* To Improve */}
                {improveTips.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      To Improve
                    </h4>
                    <ul className="space-y-3">
                      {improveTips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm text-white/75 leading-relaxed">{tip.tip}</p>
                            {tip.explanation && (
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                {tip.explanation}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
