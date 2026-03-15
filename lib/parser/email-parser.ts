export interface DetectedSubscription {
  name: string | null;
  amount: number | null;
  currency: string | null;
  cycle: string | null;
  trialEnd: string | null;
  confidence: number;
  type: "new" | "cancellation" | "price_change" | "trial";
}

const SUBSCRIPTION_KEYWORDS = [
  "subscription",
  "welcome to",
  "your plan",
  "trial",
  "receipt",
  "invoice",
  "billing",
  "membership",
  "renewal",
  "recurring",
];

const CANCEL_KEYWORDS = [
  "cancelled",
  "canceled",
  "cancellation",
  "unsubscribed",
  "ended your",
  "plan has been removed",
];

const PRICE_CHANGE_KEYWORDS = [
  "price change",
  "price increase",
  "new price",
  "rate change",
  "price update",
  "will change to",
];

const TRIAL_KEYWORDS = [
  "free trial",
  "trial period",
  "trial starts",
  "trial begins",
  "day trial",
  "try free",
];

const PRICE_PATTERN = /(?:[$€£¥₩])[\s]?(\d+[.,]?\d{0,2})/g;
const PRICE_PATTERN_SUFFIX = /(\d+[.,]?\d{0,2})\s*(?:USD|EUR|GBP|JPY|KRW)/gi;
const MONTHLY_PATTERN = /(?:per\s+month|\/mo(?:nth)?|monthly|each\s+month)/i;
const YEARLY_PATTERN = /(?:per\s+year|\/yr|\/year|yearly|annually|annual)/i;
const TRIAL_DURATION = /(\d+)[\s-]*(?:day|days)\s*(?:free\s+)?trial/i;

const CURRENCY_SYMBOLS: Record<string, string> = {
  $: "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "₩": "KRW",
};

export function parseEmail(subject: string, body: string, from: string): DetectedSubscription {
  const text = `${subject} ${body}`.toLowerCase();
  const fullText = `${subject} ${body}`;

  let type: DetectedSubscription["type"] = "new";
  let confidence = 0;

  // Determine type
  if (CANCEL_KEYWORDS.some((k) => text.includes(k))) {
    type = "cancellation";
    confidence += 0.3;
  } else if (PRICE_CHANGE_KEYWORDS.some((k) => text.includes(k))) {
    type = "price_change";
    confidence += 0.2;
  } else if (TRIAL_KEYWORDS.some((k) => text.includes(k))) {
    type = "trial";
    confidence += 0.3;
  } else if (SUBSCRIPTION_KEYWORDS.some((k) => text.includes(k))) {
    confidence += 0.2;
  }

  // Extract service name from sender
  let name: string | null = null;
  const fromMatch = from.match(/^"?(.+?)"?\s*</);
  if (fromMatch) {
    name = fromMatch[1].replace(/\s*(Support|Team|Billing|Notifications?|No-?Reply)\s*/gi, "").trim();
  }
  if (!name || name.length < 2) {
    const domainMatch = from.match(/@([\w.-]+)/);
    if (domainMatch) {
      name = domainMatch[1].split(".")[0];
      name = name.charAt(0).toUpperCase() + name.slice(1);
    }
  }

  // Extract amount and currency
  let amount: number | null = null;
  let currency: string | null = null;

  const priceMatches = fullText.match(PRICE_PATTERN);
  if (priceMatches && priceMatches.length > 0) {
    const match = priceMatches[0];
    const symbol = match.charAt(0);
    currency = CURRENCY_SYMBOLS[symbol] || "USD";
    amount = parseFloat(match.slice(1).replace(",", ".").trim());
    confidence += 0.3;
  }

  if (!amount) {
    const suffixMatches = fullText.match(PRICE_PATTERN_SUFFIX);
    if (suffixMatches && suffixMatches.length > 0) {
      const parts = suffixMatches[0].match(/(\d+[.,]?\d{0,2})\s*(USD|EUR|GBP|JPY|KRW)/i);
      if (parts) {
        amount = parseFloat(parts[1].replace(",", "."));
        currency = parts[2].toUpperCase();
        confidence += 0.3;
      }
    }
  }

  // Determine cycle
  let cycle: string | null = null;
  if (type === "trial") {
    cycle = "trial";
  } else if (YEARLY_PATTERN.test(text)) {
    cycle = "yearly";
    confidence += 0.1;
  } else if (MONTHLY_PATTERN.test(text)) {
    cycle = "monthly";
    confidence += 0.1;
  }

  // Trial end date
  let trialEnd: string | null = null;
  if (type === "trial") {
    const durationMatch = text.match(TRIAL_DURATION);
    if (durationMatch) {
      const days = parseInt(durationMatch[1], 10);
      const end = new Date();
      end.setDate(end.getDate() + days);
      trialEnd = end.toISOString().split("T")[0];
      confidence += 0.1;
    }
  }

  return {
    name,
    amount,
    currency,
    cycle,
    trialEnd,
    confidence: Math.min(confidence, 1),
    type,
  };
}
