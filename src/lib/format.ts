const priceFormat = new Map<number, Intl.NumberFormat>();

export function priceDecimals(abs: number): number {
  if (!Number.isFinite(abs) || abs >= 100) return 2;
  if (abs >= 1) return 4;
  if (abs >= 0.01) return 5;
  return 8;
}

export function roundPrice(n: number): number {
  if (!Number.isFinite(n)) return Number.NaN;
  return Number(n.toFixed(priceDecimals(Math.abs(n))));
}

/** Suggested stop or gain, rounded with the same decimals as the source price. */
export function movePrice(price: number, percent: number): number | null {
  if (!(price > 0) || !Number.isFinite(percent)) return null;
  const next = price * (1 + percent / 100);
  if (!(next > 0) || !Number.isFinite(next)) return null;
  const digits = priceDecimals(price);
  const rounded = Number(next.toFixed(digits));
  return rounded > 0 ? rounded : null;
}

export function distancePct(price: number, level: number): number | null {
  if (!(price > 0) || !Number.isFinite(level)) return null;
  return ((level - price) / price) * 100;
}

export function spreadPct(bid: number, ask: number, price: number): number | null {
  if (!(price > 0) || !(bid > 0) || !Number.isFinite(ask) || ask < bid) return null;
  return ((ask - bid) / price) * 100;
}

export function formatRatio(numerator: number, denominator: number): string {
  if (!(denominator > 0) || !Number.isFinite(numerator)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(numerator / denominator);
}

export function formatPrice(n: number): string {
  const digits = priceDecimals(Math.abs(n));
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
  const cleaned = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function toInput(n: number): string {
  const rounded = roundPrice(n);
  if (!Number.isFinite(rounded) || !(rounded > 0)) return "";
  return formatPrice(rounded);
}
