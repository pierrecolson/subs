import cron from "node-cron";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchAndCacheRates } from "@/lib/currency";
import { pollAllAccounts } from "@/lib/gmail";
import { sendPushToUser, logNotification } from "@/lib/push";

let initialized = false;

export function startCronJobs() {
  if (initialized) return;
  initialized = true;

  // Poll Gmail every 60 minutes
  cron.schedule("0 * * * *", async () => {
    console.log("[cron] Polling Gmail accounts...");
    try {
      await pollAllAccounts();
    } catch (err) {
      console.error("[cron] Gmail poll error:", err);
    }
  });

  // Daily job: trial warnings, upcoming charges, currency refresh
  cron.schedule("0 8 * * *", async () => {
    console.log("[cron] Running daily tasks...");
    try {
      await fetchAndCacheRates();
    } catch (err) {
      console.error("[cron] Currency refresh error:", err);
    }

    try {
      await processTrialWarnings();
    } catch (err) {
      console.error("[cron] Trial warnings error:", err);
    }

    try {
      await processUpcomingCharges();
    } catch (err) {
      console.error("[cron] Upcoming charges error:", err);
    }
  });

  console.log("[cron] Jobs scheduled.");
}

async function processTrialWarnings(): Promise<void> {
  const supabase = createServiceClient();
  const today = new Date();

  const { data: trials } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("cycle", "trial")
    .eq("status", "active")
    .not("trial_end_date", "is", null);

  if (!trials) return;

  for (const trial of trials) {
    const endDate = new Date(trial.trial_end_date);
    const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let title = "";
    let body = "";

    if (daysUntilEnd === 7) {
      title = `Trial ending soon: ${trial.name}`;
      body = `Your trial ends in 7 days. Monthly cost will be ${trial.currency} ${trial.amount}.`;
    } else if (daysUntilEnd === 1) {
      title = `Trial ends tomorrow: ${trial.name}`;
      body = `Cancel now to avoid being charged ${trial.currency} ${trial.amount}/month.${trial.cancel_url ? " Tap to cancel." : ""}`;
    } else if (daysUntilEnd === 0) {
      title = `Trial ends today: ${trial.name}`;
      body = `Your trial expires today. You'll be charged ${trial.currency} ${trial.amount}.`;
    } else if (daysUntilEnd === -1) {
      title = `Trial converted: ${trial.name}`;
      body = `Your trial has ended. Change status to active if you're keeping it.`;
    } else {
      continue;
    }

    await sendPushToUser(trial.user_id, {
      title,
      body,
      tag: `trial-${trial.id}-${daysUntilEnd}`,
      subscriptionId: trial.id,
      url: trial.cancel_url || "/",
    });

    await logNotification(trial.user_id, "trial_warning", trial.id, title, body);
  }
}

async function processUpcomingCharges(): Promise<void> {
  const supabase = createServiceClient();
  const today = new Date();
  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(today.getDate() + 3);

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("status", "active")
    .in("cycle", ["monthly", "yearly"]);

  if (!subs) return;

  for (const sub of subs) {
    const startDate = new Date(sub.start_date);
    let nextCharge: Date;

    if (sub.cycle === "monthly") {
      nextCharge = new Date(startDate);
      while (nextCharge <= today) {
        nextCharge.setMonth(nextCharge.getMonth() + 1);
      }
    } else {
      nextCharge = new Date(startDate);
      while (nextCharge <= today) {
        nextCharge.setFullYear(nextCharge.getFullYear() + 1);
      }
    }

    const daysUntilCharge = Math.ceil(
      (nextCharge.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilCharge <= 3 && daysUntilCharge >= 0) {
      const title = `Upcoming charge: ${sub.name}`;
      const body = `${sub.currency} ${sub.amount} will be charged in ${daysUntilCharge} day${daysUntilCharge !== 1 ? "s" : ""}.`;

      await sendPushToUser(sub.user_id, {
        title,
        body,
        tag: `charge-${sub.id}-${nextCharge.toISOString().split("T")[0]}`,
        subscriptionId: sub.id,
      });

      await logNotification(sub.user_id, "upcoming_charge", sub.id, title, body);
    }

    // Yearly renewal warning (30 days)
    if (sub.cycle === "yearly" && daysUntilCharge <= 30 && daysUntilCharge > 3) {
      const title = `Yearly renewal approaching: ${sub.name}`;
      const body = `${sub.currency} ${sub.amount}/year renews in ${daysUntilCharge} days.`;

      await sendPushToUser(sub.user_id, {
        title,
        body,
        tag: `yearly-${sub.id}`,
        subscriptionId: sub.id,
      });

      await logNotification(sub.user_id, "upcoming_charge", sub.id, title, body);
    }
  }
}
