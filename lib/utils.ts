import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getInitials(name: string): string {
  return name
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getDomainFromName(name: string): string {
  const map: Record<string, string> = {
    netflix: "netflix.com",
    spotify: "spotify.com",
    youtube: "youtube.com",
    notion: "notion.so",
    figma: "figma.com",
    github: "github.com",
    slack: "slack.com",
    discord: "discord.com",
    adobe: "adobe.com",
    dropbox: "dropbox.com",
    google: "google.com",
    apple: "apple.com",
    amazon: "amazon.com",
    microsoft: "microsoft.com",
    openai: "openai.com",
    chatgpt: "openai.com",
    linear: "linear.app",
    vercel: "vercel.com",
    hulu: "hulu.com",
    disney: "disneyplus.com",
  };
  const lower = name.toLowerCase();
  for (const [key, domain] of Object.entries(map)) {
    if (lower.includes(key)) return domain;
  }
  return `${lower.replace(/\s+/g, "")}.com`;
}
