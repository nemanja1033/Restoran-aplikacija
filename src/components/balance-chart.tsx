"use client";

import { useMemo } from "react";
import { formatDate } from "@/lib/format";

type BalancePoint = {
  date: string;
  value: number;
};

export function BalanceChart({ data }: { data: BalancePoint[] }) {
  const { path, areaPath, min, max } = useMemo(() => {
    if (data.length === 0) {
      return { path: "", areaPath: "", min: 0, max: 0 };
    }

    const values = data.map((d) => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;

    const points = data.map((point, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 100;
      const y = 40 - ((point.value - minValue) / range) * 36 - 2;
      return [x, y] as const;
    });

    const pathLine = points
      .map(([x, y], idx) => `${idx === 0 ? "M" : "L"}${x} ${y}`)
      .join(" ");

    const area = `${pathLine} L100 40 L0 40 Z`;

    return { path: pathLine, areaPath: area, min: minValue, max: maxValue };
  }, [data]);

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Stanje na računu (poslednjih 30 dana)
          </p>
          <h3 className="text-xl font-semibold">Trend kretanja</h3>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>Min: {min.toFixed(0)}</p>
          <p>Maks: {max.toFixed(0)}</p>
        </div>
      </div>
      <div className="mt-4">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nema podataka.</p>
        ) : (
          <svg viewBox="0 0 100 40" className="h-32 w-full">
            <defs>
              <linearGradient id="balanceGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#balanceGradient)" />
            <path
              d={path}
              fill="none"
              stroke="#0f172a"
              strokeWidth="1.4"
              className="dark:stroke-white"
            />
            {data.map((point, index) => {
              const x = (index / Math.max(data.length - 1, 1)) * 100;
              const y =
                40 -
                ((point.value - min) / (max - min || 1)) * 36 -
                2;
              return (
                <circle
                  key={point.date}
                  cx={x}
                  cy={y}
                  r={1.4}
                  fill="#0f172a"
                  className="dark:fill-white"
                >
                  <title>{`${formatDate(point.date)}: ${point.value.toFixed(0)}`}</title>
                </circle>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
