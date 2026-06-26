"use client";

interface ScoreRingProps {
  score: number | null;
  size?: number;
}

export function ScoreRing({ score, size = 56 }: ScoreRingProps) {
  const r = (size / 2) * 0.72;
  const circumference = 2 * Math.PI * r;
  const center = size / 2;

  const getColor = (s: number) => {
    if (s >= 65) return "#22c55e";
    if (s >= 45) return "#f59e0b";
    return "#ef4444";
  };

  const getClass = (s: number) => {
    if (s >= 65) return "high";
    if (s >= 45) return "mid";
    return "low";
  };

  if (score === null) {
    return (
      <div className="score-ring" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke="#242424"
            strokeWidth="3"
          />
        </svg>
        <span className="score-number none">—</span>
      </div>
    );
  }

  const pct = score / 100;
  const dash = circumference * pct;
  const gap = circumference - dash;
  const color = getColor(score);

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="#1e1e1e"
          strokeWidth="3"
        />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${dash} ${gap}`}
          strokeLinecap="round"
        />
      </svg>
      <span className={`score-number ${getClass(score)}`}>{score}</span>
    </div>
  );
}

export function ScoreLabel({ score }: { score: number }) {
  if (score >= 75) return "Nailed it";
  if (score >= 65) return "Delivered";
  if (score >= 50) return "Partial";
  if (score >= 35) return "Fell short";
  return "Missed";
}
