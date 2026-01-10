"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, subDays } from "date-fns";

export type DateRange = {
  from: string;
  to: string;
  label: string;
};

export function DateRangeFilter({
  active,
  onChange,
}: {
  active: string;
  onChange: (range: DateRange) => void;
}) {
  const ranges = useMemo(() => {
    const today = new Date();
    return [
      {
        label: "7 dana",
        from: format(subDays(today, 6), "yyyy-MM-dd"),
        to: format(today, "yyyy-MM-dd"),
      },
      {
        label: "30 dana",
        from: format(subDays(today, 29), "yyyy-MM-dd"),
        to: format(today, "yyyy-MM-dd"),
      },
      {
        label: "90 dana",
        from: format(subDays(today, 89), "yyyy-MM-dd"),
        to: format(today, "yyyy-MM-dd"),
      },
    ];
  }, []);

  return (
    <div className="flex flex-wrap gap-2">
      {ranges.map((range) => (
        <Button
          key={range.label}
          variant="outline"
          className={cn(
            "rounded-full",
            active === range.label && "border-primary bg-primary/10"
          )}
          onClick={() => onChange(range)}
        >
          {range.label}
        </Button>
      ))}
    </div>
  );
}
