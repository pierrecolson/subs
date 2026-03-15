"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Settings, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubscriptionCard } from "@/components/subscription-card";
import { UpcomingRow } from "@/components/upcoming-row";
import { NotificationStack } from "@/components/notification-stack";
import { NotificationDrawer } from "@/components/notification-drawer";
import { AddSheet } from "@/components/add-sheet";
import { BreakdownPills } from "@/components/breakdown-pills";
import { formatCurrency } from "@/lib/utils";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";

interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  cycle: string;
  category: string;
  status: string;
  start_date: string;
  trial_end_date?: string;
  cancel_url?: string;
  needs_expense?: boolean;
  payment_method_id?: string;
  payment_methods?: { name: string; network: string } | null;
}

interface PaymentMethod {
  id: string;
  name: string;
  network: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  sent_at: string;
  read_at: string | null;
  subscription_id?: string;
}

interface ExchangeRate {
  base: string;
  target: string;
  rate: number;
}

export default function HomePage() {
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: { full_name?: string } } | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [homeCurrency, setHomeCurrency] = useState("EUR");
  const [displayCurrency, setDisplayCurrency] = useState("EUR");
  const [addOpen, setAddOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) {
      setLoading(false);
      return;
    }
    setUser(u);

    const [subsRes, pmRes, notifRes, ratesRes, settingsRes] = await Promise.all([
      fetch("/api/subscriptions"),
      fetch("/api/payment-methods"),
      fetch("/api/notifications"),
      supabase.from("exchange_rates").select("*"),
      fetch("/api/settings"),
    ]);

    const [subs, pms, notifs, settings] = await Promise.all([
      subsRes.json(),
      pmRes.json(),
      notifRes.json(),
      settingsRes.json(),
    ]);

    setSubscriptions(Array.isArray(subs) ? subs : []);
    setPaymentMethods(Array.isArray(pms) ? pms : []);
    setNotifications(Array.isArray(notifs) ? notifs : []);
    setRates(ratesRes.data || []);
    setHomeCurrency(settings?.home_currency || "EUR");
    setDisplayCurrency(settings?.home_currency || "EUR");
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, [loadData]);

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  };

  const handleAddOrEdit = async (data: Record<string, unknown>) => {
    const id = data.id as string | undefined;
    const { id: _, ...body } = data;

    if (id) {
      await fetch(`/api/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    setEditData(null);
    loadData();
  };

  const handleMarkRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
  };

  const handleNotificationAction = async (notificationId: string, action: string) => {
    if (action === "dismiss" || action === "keep") {
      await handleMarkRead(notificationId);
    } else if (action === "ignore") {
      await handleMarkRead(notificationId);
    } else if (action === "archive") {
      const notif = notifications.find((n) => n.id === notificationId);
      if (notif?.subscription_id) {
        await fetch(`/api/subscriptions/${notif.subscription_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "cancelled" }),
        });
        loadData();
      }
      await handleMarkRead(notificationId);
    }
  };

  const cycleCurrency = () => {
    const idx = SUPPORTED_CURRENCIES.indexOf(displayCurrency);
    setDisplayCurrency(SUPPORTED_CURRENCIES[(idx + 1) % SUPPORTED_CURRENCIES.length]);
  };

  const convert = (amount: number, fromCurrency: string): number => {
    if (fromCurrency === displayCurrency) return amount;
    let amountInBase = amount;
    if (fromCurrency !== "EUR") {
      const r = rates.find((r) => r.target === fromCurrency);
      if (r) amountInBase = amount / r.rate;
    }
    if (displayCurrency === "EUR") return amountInBase;
    const toRate = rates.find((r) => r.target === displayCurrency);
    return toRate ? amountInBase * toRate.rate : amount;
  };

  // Calculations
  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const monthlyTotal = activeSubs.reduce((sum, s) => {
    const converted = convert(s.amount, s.currency);
    if (s.cycle === "yearly") return sum + converted / 12;
    if (s.cycle === "trial") return sum;
    return sum + converted;
  }, 0);

  const personalTotal = activeSubs
    .filter((s) => s.category === "personal" && s.cycle !== "trial")
    .reduce((sum, s) => {
      const converted = convert(s.amount, s.currency);
      return sum + (s.cycle === "yearly" ? converted / 12 : converted);
    }, 0);

  const workTotal = activeSubs
    .filter((s) => s.category === "work" && s.cycle !== "trial")
    .reduce((sum, s) => {
      const converted = convert(s.amount, s.currency);
      return sum + (s.cycle === "yearly" ? converted / 12 : converted);
    }, 0);

  const trialCount = activeSubs.filter((s) => s.cycle === "trial").length;

  // Upcoming charges (next 7 days)
  const upcoming = activeSubs
    .map((s) => {
      const today = new Date();
      let daysUntil: number;
      let type: "charge" | "trial_end" = "charge";

      if (s.cycle === "trial" && s.trial_end_date) {
        daysUntil = Math.ceil((new Date(s.trial_end_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        type = "trial_end";
      } else {
        const start = new Date(s.start_date);
        let next = new Date(start);
        if (s.cycle === "monthly") {
          while (next <= today) next.setMonth(next.getMonth() + 1);
        } else if (s.cycle === "yearly") {
          while (next <= today) next.setFullYear(next.getFullYear() + 1);
        } else {
          return null;
        }
        daysUntil = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      if (daysUntil < 0 || daysUntil > 7) return null;
      return { id: s.id, name: s.name, amount: s.amount, currency: s.currency, daysUntil, type };
    })
    .filter(Boolean)
    .sort((a, b) => a!.daysUntil - b!.daysUntil) as { id: string; name: string; amount: number; currency: string; daysUntil: number; type: "charge" | "trial_end" }[];

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">SubTrack</h1>
          <p className="text-muted-foreground mt-2">Never forget a charge. Never let a trial slip.</p>
        </div>
        <Button onClick={handleSignIn} size="lg" className="w-full max-w-xs">
          Sign in with Google
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 pt-safe">
      {/* Top Bar */}
      <div className="flex items-center justify-between py-4">
        <h1 className="text-xl font-bold">SubTrack</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setDrawerOpen(true)} className="relative p-2">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
          <a href="/settings" className="p-2">
            <Settings className="w-5 h-5" />
          </a>
        </div>
      </div>

      {/* Monthly Total */}
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground">Monthly spending</p>
        <button onClick={cycleCurrency} className="text-4xl font-bold mt-1 hover:opacity-80 transition-opacity">
          {formatCurrency(monthlyTotal, displayCurrency)}
        </button>
        <p className="text-xs text-muted-foreground mt-1">
          {formatCurrency(monthlyTotal * 12, displayCurrency)}/year
        </p>
      </div>

      {/* Breakdown Pills */}
      <div className="flex justify-center mb-6">
        <BreakdownPills
          personalTotal={personalTotal}
          workTotal={workTotal}
          trialCount={trialCount}
          currency={displayCurrency}
        />
      </div>

      {/* Notification Stack */}
      <NotificationStack notifications={notifications} onOpenDrawer={() => setDrawerOpen(true)} />

      {/* Upcoming Charges */}
      {upcoming.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Upcoming</h3>
          <div className="space-y-1">
            {upcoming.map((item) => (
              <UpcomingRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* All Subscriptions */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Subscriptions ({activeSubs.length})
          </h3>
        </div>
        <div className="space-y-2">
          {activeSubs.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              subscription={sub}
              onEdit={(s) => {
                setEditData(s as unknown as Record<string, unknown>);
                setAddOpen(true);
              }}
            />
          ))}
          {activeSubs.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No subscriptions yet. Tap + to add one.
            </p>
          )}
        </div>
      </div>

      {/* Cancelled / Paused */}
      {subscriptions.filter((s) => s.status !== "active").length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Inactive</h3>
          <div className="space-y-2 opacity-60">
            {subscriptions
              .filter((s) => s.status !== "active")
              .map((sub) => (
                <SubscriptionCard
                  key={sub.id}
                  subscription={sub}
                  onEdit={(s) => {
                    setEditData(s as unknown as Record<string, unknown>);
                    setAddOpen(true);
                  }}
                />
              ))}
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => {
          setEditData(null);
          setAddOpen(true);
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add/Edit Sheet */}
      <AddSheet
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) setEditData(null);
        }}
        paymentMethods={paymentMethods}
        onSubmit={handleAddOrEdit}
        editData={editData}
      />

      {/* Notification Drawer */}
      <NotificationDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        notifications={notifications}
        onMarkRead={handleMarkRead}
        onAction={handleNotificationAction}
      />
    </div>
  );
}
