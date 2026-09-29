// No "use client" needed — Radix Tabs handles its own state internally.
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

function getBadgeClass(score) {
  if (score >= 80) return "bg-green-500/20 text-green-400 border-green-500/30";
  if (score >= 60) return "bg-lime-500/20 text-lime-400 border-lime-500/30";
  if (score >= 40) return "bg-orange-500/20 text-orange-400 border-orange-500/30";
  return "bg-red-500/20 text-red-400 border-red-500/30";
}

function getBadgeLabel(score) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Moderate";
  return "Weak";
}

/* ─── Single bullet point ─────────────────────────────────────────────────── */
function BulletPoint({ title, detail, seenIn, variant }) {
  const isImprovement = variant === "improvement";
  return (
    <div className="space-y-1.5">
      <p className={[
        "text-sm font-semibold leading-snug",
        isImprovement ? "text-white" : "text-white",
      ].join(" ")}>
        {title}
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed">{detail}</p>
      {seenIn && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {seenIn.split(",").map((q) => q.trim()).filter(Boolean).map((q) => (
            <span key={q} className="text-[11px] px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground">
              {q}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Bullet section (improvements or strengths) ─────────────────────────── */
function BulletSection({ title, items, variant }) {
  if (!items?.length) return null;
  const isImprovement = variant === "improvement";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {isImprovement
          ? <TrendingDown className="h-4 w-4 text-orange-400 shrink-0" />
          : <TrendingUp   className="h-4 w-4 text-green-400  shrink-0" />
        }
        <h4 className="text-sm font-bold text-white tracking-wide uppercase">
          {title}
        </h4>
      </div>
      <div className="space-y-5 pl-6 border-l border-white/[0.07]">
        {items.map((item, i) => (
          <BulletPoint key={i} {...item} variant={variant} />
        ))}
      </div>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────── */
export default function DetailedBreakdown({ categories }) {
  if (!categories?.length) return null;

  return (
    <Card className="border-white/10 bg-[#0c0e14]">
      <CardContent className="p-6">
        <h2 className="text-xl font-bold text-white mb-5">Detailed Breakdown</h2>

        <Tabs defaultValue={categories[0].name}>
          {/* Tab strip */}
          <TabsList className="h-auto w-full justify-start flex-wrap gap-0 rounded-none border-b border-white/10 bg-transparent p-0">
            {categories.map((cat) => (
              <TabsTrigger
                key={cat.name}
                value={cat.name}
                className={[
                  "rounded-none border-b-2 border-transparent -mb-px px-4 py-2.5 h-auto",
                  "text-muted-foreground font-medium bg-transparent shadow-none",
                  "data-[state=active]:border-green-400 data-[state=active]:text-white",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  "hover:text-white transition-colors",
                ].join(" ")}
              >
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab panels */}
          {categories.map((cat) => (
            <TabsContent key={cat.name} value={cat.name} className="mt-6 space-y-7">

              {/* Title + score + badge */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-2xl font-bold text-white">{cat.name}</h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xl font-bold text-white">{cat.score}</span>
                  <span className="text-muted-foreground text-sm">/100</span>
                  <Badge variant="outline" className={getBadgeClass(cat.score)}>
                    {getBadgeLabel(cat.score)}
                  </Badge>
                </div>
              </div>

              {/* Overall comment */}
              {cat.comment && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {cat.comment}
                </p>
              )}

              {/* Divider */}
              {((cat.improvements?.length > 0) || (cat.strengths?.length > 0)) && (
                <div className="border-t border-white/[0.07]" />
              )}

              {/* Improvements */}
              <BulletSection
                title="Where You Can Improve"
                items={cat.improvements}
                variant="improvement"
              />

              {/* Strengths */}
              <BulletSection
                title="What You Are Doing Well"
                items={cat.strengths}
                variant="strength"
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
