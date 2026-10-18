const priceFormat = new Map<number, Intl.NumberFormat>();

function digitsFor(abs: number): number {
  if (abs >= 1000) return 2;
  if (abs >= 1) return 4;
  if (abs >= 0.01) return 5;
  return 8;
}

export function formatPrice(n: number): string {
  const digits = digitsFor(Math.abs(n));
  let fmt = priceFormat.get(digits);
  if (!fmt) {
    fmt = new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: Math.min(2, digits),
      maximumFractionDigits: digits,
    });
    priceFormat.set(digits, fmt);
  }
  return fmt.format(n);
}

export function formatPct(n: number): string {
  const sign = n > 0 ? "+" : "";
  const body = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `${sign}${body} %`;
}

export function formatQuote(n: number): string {
  const body = new Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
  return `${body} USDT`;
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatAgo(ts: number): string {
  const seconds = Math.max(0, (Date.now() - ts) / 1000);
  if (seconds < 60) return "à l’instant";
  if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)} h`;
  return `il y a ${Math.floor(seconds / 86400)} j`;
}

export function parsePx(raw: string): number | null {
  const n = Number(raw.trim().replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function toInput(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return n.toFixed(2);
  if (abs >= 1) return n.toFixed(4);
  if (abs >= 0.01) return n.toFixed(6);
  return n.toPrecision(6);
}
