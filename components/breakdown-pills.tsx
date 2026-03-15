"use client";

import { Badge } from "@/components/ui/badge";

interface BreakdownPillsProps {
  personalTotal: number;
  workTotal: number;
  trialCount: number;
  currency: string;
}

export function BreakdownPills({ personalTotal, workTotal, trialCount, currency }: BreakdownPillsProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

  return (
    <div className="flex gap-2 flex-wrap">
      <Badge variant="secondary" className="text-xs px-3 py-1">
        Personal {fmt(personalTotal)}
      </Badge>
      <Badge variant="secondary" className="text-xs px-3 py-1">
        Work {fmt(workTotal)}
      </Badge>
      {trialCount > 0 && (
        <Badge variant="outline" className="text-xs px-3 py-1 border-yellow-500/50 text-yellow-500">
          {trialCount} Trial{trialCount > 1 ? "s" : ""}
        </Badge>
      )}
    </div>
  );
}
