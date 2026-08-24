"use client";

export default function ScoreCircle({ score, size = "md" }) {
  const configs = {
    sm: { dim: 52,  stroke: 4.5, r: 20, numClass: "text-sm",  sub: false },
    md: { dim: 88,  stroke: 6.5, r: 34, numClass: "text-xl",  sub: false },
    lg: { dim: 110, stroke: 8,   r: 43, numClass: "text-3xl", sub: true  },
  };

  const { dim, stroke, r, numClass, sub } = configs[size];
  const circ    = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, score ?? 0));
  const offset  = circ - (clamped / 100) * circ;

  const color = clamped >= 70
    ? { stroke: "#22c55e", text: "#4ade80" }
    : clamped >= 40
    ? { stroke: "#f59e0b", text: "#fbbf24" }
    : { stroke: "#ef4444", text: "#f87171" };

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90">
          {/* Track */}
          <circle
            cx={dim / 2} cy={dim / 2} r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
          />
          {/* Progress */}
          <circle
            cx={dim / 2} cy={dim / 2} r={r}
            fill="none"
            stroke={color.stroke}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold leading-none tabular-nums ${numClass}`} style={{ color: color.text }}>
            {clamped}
          </span>
          {sub && <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">/ 100</span>}
        </div>
      </div>
    </div>
  );
}
