"use client";

import { useState } from "react";
import { getInitials, getDomainFromName } from "@/lib/utils";

interface ServiceIconProps {
  name: string;
  size?: number;
  className?: string;
}

export function ServiceIcon({ name, size = 40, className = "" }: ServiceIconProps) {
  const [failed, setFailed] = useState(false);
  const domain = getDomainFromName(name);
  const initials = getInitials(name);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-secondary text-foreground font-semibold ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={`https://img.logo.dev/${domain}?token=pk_free&size=${size * 2}`}
      alt={name}
      width={size}
      height={size}
      className={`rounded-xl ${className}`}
      onError={() => setFailed(true)}
    />
  );
}

export function CardIcon({ network, size = 24 }: { network: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const domainMap: Record<string, string> = {
    visa: "visa.com",
    mastercard: "mastercard.com",
    amex: "americanexpress.com",
  };
  const domain = domainMap[network];

  if (!domain || failed) {
    return (
      <div
        className="flex items-center justify-center rounded bg-secondary text-xs font-bold uppercase"
        style={{ width: size, height: size * 0.65 }}
      >
        {network?.slice(0, 2) || "??"}
      </div>
    );
  }

  return (
    <img
      src={`https://img.logo.dev/${domain}?token=pk_free&size=${size * 2}`}
      alt={network}
      width={size}
      height={size * 0.65}
      className="rounded"
      onError={() => setFailed(true)}
    />
  );
}
