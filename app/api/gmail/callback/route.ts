import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getOAuth2Client } from "@/lib/gmail";
import { google } from "googleapis";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // user_id

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/settings?error=gmail_auth`);
  }

  try {
    const client = getOAuth2Client();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Get the user's email
    const gmail = google.gmail({ version: "v1", auth: client });
    const profile = await gmail.users.getProfile({ userId: "me" });
    const email = profile.data.emailAddress!;

    const supabase = createServiceClient();

    // Upsert the connected account
    await supabase.from("connected_accounts").upsert(
      {
        user_id: state,
        email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token!,
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        history_id: profile.data.historyId?.toString(),
        is_active: true,
      },
      { onConflict: "user_id,email", ignoreDuplicates: false }
    );

    return NextResponse.redirect(`${origin}/settings?gmail=connected`);
  } catch (err) {
    console.error("Gmail callback error:", err);
    return NextResponse.redirect(`${origin}/settings?error=gmail_auth`);
  }
}
