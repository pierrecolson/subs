import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGmailAuthUrl } from "@/lib/gmail";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("connected_accounts")
    .select("id, email, is_active, last_polled_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authUrl = getGmailAuthUrl(user.id);
  return NextResponse.json({ url: authUrl });
}
