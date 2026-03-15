"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ServiceIcon } from "@/components/service-icon";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";

interface PaymentMethod {
  id: string;
  name: string;
  network: string;
}

interface AddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethods: PaymentMethod[];
  onSubmit: (data: Record<string, unknown>) => void;
  editData?: Record<string, unknown> | null;
}

export function AddSheet({ open, onOpenChange, paymentMethods, onSubmit, editData }: AddSheetProps) {
  const [name, setName] = useState((editData?.name as string) || "");
  const [amount, setAmount] = useState((editData?.amount as string) || "");
  const [currency, setCurrency] = useState((editData?.currency as string) || "EUR");
  const [cycle, setCycle] = useState((editData?.cycle as string) || "monthly");
  const [trialEndDate, setTrialEndDate] = useState((editData?.trial_end_date as string) || "");
  const [cancelUrl, setCancelUrl] = useState((editData?.cancel_url as string) || "");
  const [startDate, setStartDate] = useState(
    (editData?.start_date as string) || new Date().toISOString().split("T")[0]
  );
  const [category, setCategory] = useState((editData?.category as string) || "personal");
  const [needsExpense, setNeedsExpense] = useState((editData?.needs_expense as boolean) || false);
  const [paymentMethodId, setPaymentMethodId] = useState((editData?.payment_method_id as string) || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...(editData?.id ? { id: editData.id } : {}),
      name,
      amount: parseFloat(amount),
      currency,
      cycle,
      trial_end_date: cycle === "trial" ? trialEndDate || null : null,
      cancel_url: cycle === "trial" ? cancelUrl || null : null,
      start_date: startDate,
      category,
      needs_expense: category === "work" ? needsExpense : false,
      payment_method_id: paymentMethodId || null,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{editData?.id ? "Edit Subscription" : "Add Subscription"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="flex items-end gap-3">
            <ServiceIcon name={name || "app"} size={40} />
            <div className="flex-1">
              <Label htmlFor="name">Service name</Label>
              <Input
                id="name"
                placeholder="Netflix, Spotify..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="9.99"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="w-24">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Billing cycle</Label>
            <div className="flex gap-2 mt-1">
              {["monthly", "yearly", "trial"].map((c) => (
                <Button
                  key={c}
                  type="button"
                  variant={cycle === c ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCycle(c)}
                  className="capitalize"
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>

          {cycle === "trial" && (
            <>
              <div>
                <Label htmlFor="trialEnd">Trial end date</Label>
                <Input
                  id="trialEnd"
                  type="date"
                  value={trialEndDate}
                  onChange={(e) => setTrialEndDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="cancelUrl">Cancel URL</Label>
                <Input
                  id="cancelUrl"
                  type="url"
                  placeholder="https://..."
                  value={cancelUrl}
                  onChange={(e) => setCancelUrl(e.target.value)}
                />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="startDate">Start date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Category</Label>
            <div className="flex gap-2 mt-1">
              {["personal", "work"].map((c) => (
                <Button
                  key={c}
                  type="button"
                  variant={category === c ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategory(c)}
                  className="capitalize"
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>

          {category === "work" && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="expense"
                checked={needsExpense}
                onChange={(e) => setNeedsExpense(e.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="expense">Needs expensing</Label>
            </div>
          )}

          {paymentMethods.length > 0 && (
            <div>
              <Label>Payment method</Label>
              <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                <SelectTrigger><SelectValue placeholder="Select card" /></SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((pm) => (
                    <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button type="submit" className="w-full">
            {editData?.id ? "Save Changes" : "Add Subscription"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
