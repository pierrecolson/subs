"use client";

import { ServiceIcon } from "@/components/service-icon";
import { formatCurrency } from "@/lib/utils";

interface UpcomingCharge {
  id: string;
  name: string;
  amount: number;
  currency: string;
  daysUntil: number;
  type: "charge" | "trial_end";
}

export function UpcomingRow({ item }: { item: UpcomingCharge }) {
  const label =
    item.daysUntil === 0
      ? "Today"
      : item.daysUntil === 1
        ? "Tomorrow"
        : `In ${item.daysUntil} days`;

  return (
    <div className="flex items-center gap-3 py-2">
      <ServiceIcon name={item.name} size={32} />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">{item.name}</span>
        <span className="text-xs text-muted-foreground">
          {item.type === "trial_end" ? "Trial ends" : "Charges"} {label.toLowerCase()}
        </span>
      </div>
      <div className="text-sm font-semibold">
        {formatCurrency(item.amount, item.currency)}
      </div>
    </div>
  );
}
