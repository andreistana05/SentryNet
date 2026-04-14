export function formatLastSeen(lastSeen: string | null, now: number): string {
  if (!lastSeen) return "Never";

  const diff = Math.max(0, Math.floor((now - new Date(lastSeen).getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function formatMetricValue(value: unknown, unit?: string): string {
  if (value === null || value === undefined || value === "") {
    return "Not reporting";
  }

  if (typeof value === "number") {
    const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(1);
    if (!unit) return formatted;
    return unit === "C" ? `${formatted} deg C` : `${formatted}${unit === "%" ? "%" : ` ${unit}`}`;
  }

  return String(value);
}

export function formatTimestamp(value?: string | null): string {
  if (!value) return "Awaiting telemetry";

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Awaiting telemetry";
  }
}

export function statusClassName(value: unknown): string {
  return String(value || "unknown").toLowerCase().replace(/\s+/g, "-");
}
