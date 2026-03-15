import { google } from "googleapis";
import { createServiceClient } from "@/lib/supabase/server";
import { parseEmail } from "@/lib/parser/email-parser";
import { sendPushToUser, logNotification } from "@/lib/push";

const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/gmail/callback`
  );
}

export function getGmailAuthUrl(state: string): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: GMAIL_SCOPES,
    prompt: "consent",
    state,
  });
}

async function refreshTokenIfNeeded(account: {
  id: string;
  access_token: string | null;
  refresh_token: string;
  token_expiry: string | null;
}) {
  const supabase = createServiceClient();
  const now = new Date();
  const expiry = account.token_expiry ? new Date(account.token_expiry) : now;

  if (account.access_token && expiry > now) {
    return account.access_token;
  }

  const client = getOAuth2Client();
  client.setCredentials({ refresh_token: account.refresh_token });
  const { credentials } = await client.refreshAccessToken();

  await supabase
    .from("connected_accounts")
    .update({
      access_token: credentials.access_token,
      token_expiry: credentials.expiry_date
        ? new Date(credentials.expiry_date).toISOString()
        : null,
    })
    .eq("id", account.id);

  return credentials.access_token!;
}

export async function pollGmailAccount(account: {
  id: string;
  user_id: string;
  email: string;
  access_token: string | null;
  refresh_token: string;
  token_expiry: string | null;
  history_id: string | null;
}): Promise<void> {
  const supabase = createServiceClient();
  const accessToken = await refreshTokenIfNeeded(account);

  const client = getOAuth2Client();
  client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth: client });

  try {
    let messageIds: string[] = [];

    if (account.history_id) {
      // Incremental sync
      const history = await gmail.users.history.list({
        userId: "me",
        startHistoryId: account.history_id,
        historyTypes: ["messageAdded"],
      });

      const newHistoryId = history.data.historyId;
      messageIds =
        history.data.history?.flatMap(
          (h) => h.messagesAdded?.map((m) => m.message?.id).filter(Boolean) as string[] || []
        ) || [];

      await supabase
        .from("connected_accounts")
        .update({ history_id: newHistoryId, last_polled_at: new Date().toISOString() })
        .eq("id", account.id);
    } else {
      // Initial sync: get recent subscription-related emails
      const query = "newer_than:7d (subscription OR receipt OR invoice OR trial OR billing)";
      const list = await gmail.users.messages.list({ userId: "me", q: query, maxResults: 20 });
      messageIds = list.data.messages?.map((m) => m.id!).filter(Boolean) || [];

      const profile = await gmail.users.getProfile({ userId: "me" });
      await supabase
        .from("connected_accounts")
        .update({
          history_id: profile.data.historyId?.toString(),
          last_polled_at: new Date().toISOString(),
        })
        .eq("id", account.id);
    }

    for (const msgId of messageIds) {
      // Check if already processed
      const { data: existing } = await supabase
        .from("detected_subscriptions")
        .select("id")
        .eq("gmail_message_id", msgId)
        .single();

      if (existing) continue;

      const msg = await gmail.users.messages.get({
        userId: "me",
        id: msgId,
        format: "full",
      });

      const headers = msg.data.payload?.headers || [];
      const subject = headers.find((h) => h.name?.toLowerCase() === "subject")?.value || "";
      const from = headers.find((h) => h.name?.toLowerCase() === "from")?.value || "";

      // Extract body
      let body = "";
      const payload = msg.data.payload;
      if (payload?.body?.data) {
        body = Buffer.from(payload.body.data, "base64url").toString("utf-8");
      } else if (payload?.parts) {
        const textPart = payload.parts.find((p) => p.mimeType === "text/plain");
        if (textPart?.body?.data) {
          body = Buffer.from(textPart.body.data, "base64url").toString("utf-8");
        }
      }

      const detected = parseEmail(subject, body, from);

      if (detected.confidence < 0.2) continue;

      await supabase.from("detected_subscriptions").insert({
        user_id: account.user_id,
        raw_data: { subject, from, snippet: msg.data.snippet },
        detected_name: detected.name,
        detected_amount: detected.amount,
        detected_currency: detected.currency,
        detected_cycle: detected.cycle || (detected.type === "trial" ? "trial" : null),
        detected_trial_end: detected.trialEnd,
        gmail_account: account.email,
        gmail_message_id: msgId,
        status: "pending",
      });

      // Send push notification for high-confidence detections
      if (detected.confidence >= 0.4) {
        let title = "";
        let notifBody = "";
        let notifType = "detected";

        if (detected.type === "cancellation") {
          title = `Cancellation detected`;
          notifBody = `Looks like you cancelled ${detected.name}. Want to archive it?`;
          notifType = "cancelled";
        } else if (detected.type === "trial") {
          title = `Trial detected`;
          notifBody = `Free trial for ${detected.name} found. Want to track it?`;
        } else if (detected.type === "price_change") {
          title = `Price change detected`;
          notifBody = `${detected.name} may have changed pricing. Review?`;
        } else {
          title = `New subscription detected`;
          notifBody = `Found ${detected.name}${detected.amount ? ` at ${detected.currency || ""}${detected.amount}` : ""}. Want to add it?`;
        }

        await sendPushToUser(account.user_id, {
          title,
          body: notifBody,
          tag: `detected-${msgId}`,
        });

        await logNotification(account.user_id, notifType, null, title, notifBody);
      }
    }
  } catch (err) {
    console.error(`Gmail poll error for ${account.email}:`, err);
  }
}

export async function pollAllAccounts(): Promise<void> {
  const supabase = createServiceClient();
  const { data: accounts } = await supabase
    .from("connected_accounts")
    .select("*")
    .eq("is_active", true);

  if (!accounts) return;

  for (const account of accounts) {
    await pollGmailAccount(account);
  }
}
