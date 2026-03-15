import { createServiceClient } from "@/lib/supabase/server";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";

const FRANKFURTER_BASE = "https://api.frankfurter.app";

export async function fetchAndCacheRates(): Promise<void> {
  const supabase = createServiceClient();
  const base = "EUR";
  const targets = SUPPORTED_CURRENCIES.filter((c) => c !== base).join(",");

  const res = await fetch(`${FRANKFURTER_BASE}/latest?from=${base}&to=${targets}`);
  if (!res.ok) throw new Error(`Frankfurter API error: ${res.status}`);

  const data = await res.json();
  const rates = data.rates as Record<string, number>;

  const rows = Object.entries(rates).map(([target, rate]) => ({
    base,
    target,
    rate,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("exchange_rates").upsert(rows, { onConflict: "base,target" });
  if (error) throw error;
}

export async function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: { base: string; target: string; rate: number }[]
): Promise<number> {
  if (fromCurrency === toCurrency) return amount;

  // Convert to EUR first (base), then to target
  let amountInBase = amount;
  if (fromCurrency !== "EUR") {
    const fromRate = rates.find((r) => r.target === fromCurrency);
    if (!fromRate) return amount;
    amountInBase = amount / fromRate.rate;
  }

  if (toCurrency === "EUR") return amountInBase;

  const toRate = rates.find((r) => r.target === toCurrency);
  if (!toRate) return amount;
  return amountInBase * toRate.rate;
}

export { SUPPORTED_CURRENCIES } from "@/lib/constants";
