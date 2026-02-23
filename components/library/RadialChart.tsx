'use client';

import { useEffect, useState } from 'react';

interface RadialChartProps {
  value: number;
  total: number;
  color?: string;
  size?: number;
  label?: string;
}

export default function RadialChart({
  value,
  total,
  color = '#e94560',
  size = 80,
  label,
}: RadialChartProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedValue / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(percentage), 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={6}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-lg font-black">{value}</span>
        {label && <span className="text-[8px] text-white/30 uppercase">{label}</span>}
      </div>
    </div>
  );
}
