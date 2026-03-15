import { NextResponse } from "next/server";
import { pollAllAccounts } from "@/lib/gmail";

export async function POST() {
  try {
    await pollAllAccounts();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Manual Gmail poll error:", err);
    return NextResponse.json({ error: "Poll failed" }, { status: 500 });
  }
}
