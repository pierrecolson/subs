"use client";

import { ServiceIcon } from "@/components/service-icon";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  cycle: string;
  category: string;
  status: string;
  trial_end_date?: string;
  needs_expense?: boolean;
  payment_methods?: { name: string; network: string } | null;
}

interface SubscriptionCardProps {
  subscription: Subscription;
  onEdit?: (sub: Subscription) => void;
}

export function SubscriptionCard({ subscription: sub, onEdit }: SubscriptionCardProps) {
  const cycleLabel = sub.cycle === "trial" ? "Trial" : sub.cycle === "yearly" ? "/yr" : "/mo";
  const isTrialExpiring = sub.cycle === "trial" && sub.trial_end_date &&
    new Date(sub.trial_end_date).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-muted-foreground/20 transition-colors cursor-pointer"
      onClick={() => onEdit?.(sub)}
    >
      <ServiceIcon name={sub.name} size={40} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{sub.name}</span>
          {sub.cycle === "trial" && (
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${isTrialExpiring ? "border-red-500/50 text-red-400" : "border-yellow-500/50 text-yellow-500"}`}
            >
              Trial
            </Badge>
          )}
          {sub.status === "paused" && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/50 text-blue-400">
              Paused
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {sub.category === "work" ? "Work" : "Personal"}
          </span>
          {sub.needs_expense && (
            <span className="text-[10px] text-orange-400">Expense</span>
          )}
          {sub.payment_methods && (
            <span className="text-[10px] text-muted-foreground">{sub.payment_methods.name}</span>
          )}
        </div>
      </div>
      <div className="text-right">
        <div className="font-semibold text-sm">{formatCurrency(sub.amount, sub.currency)}</div>
        <div className="text-xs text-muted-foreground">{cycleLabel}</div>
      </div>
    </div>
  );
}
