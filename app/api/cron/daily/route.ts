import { NextResponse } from "next/server";
import { fetchAndCacheRates } from "@/lib/currency";

export async function POST() {
  try {
    await fetchAndCacheRates();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Manual daily cron error:", err);
    return NextResponse.json({ error: "Daily job failed" }, { status: 500 });
  }
}
