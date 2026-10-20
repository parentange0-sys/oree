import type { Bias, MarketRow, Quote } from "./market.ts";

export function finiteNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : Number.NaN;
}

export function baseOf(symbol: string): string {
  return symbol.slice(0, -4);
}

export function isLeveraged(base: string): boolean {
  return base.length >= 5 && /(UP|DOWN|BULL|BEAR)$/.test(base);
}

export function biasOf(change: number, pos: number): Bias {
  if ((change >= 2 && pos >= 0.62) || change >= 4) return "hausse";
  if ((change <= -2 && pos <= 0.38) || change <= -4) return "baisse";
  return "range";
}

function positive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function decodeEntities(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n: string) => {
      const code = Number(n);
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => {
      const code = Number.parseInt(n, 16);
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
    })
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function mapRows(payload: unknown): MarketRow[] {
  if (!Array.isArray(payload)) throw new Error("Réponse de marché inattendue.");
  const rows: MarketRow[] = [];
  for (const item of payload) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const symbol = typeof raw.symbol === "string" ? raw.symbol : "";
    if (!symbol.endsWith("USDT")) continue;
    const base = baseOf(symbol);
    if (!/^[A-Z0-9]{1,16}$/.test(base) || isLeveraged(base)) continue;
    const price = finiteNumber(raw.lastPrice);
    const high = finiteNumber(raw.highPrice);
    const low = finiteNumber(raw.lowPrice);
    const changePct = finiteNumber(raw.priceChangePercent);
    const quoteVolume = finiteNumber(raw.quoteVolume);
    if (!(price > 0) || !Number.isFinite(changePct)) continue;
    const safeHigh = positive(high, price);
    const safeLow = positive(low, price);
    const span = safeHigh - safeLow;
    const rangePos = span > 0 ? Math.min(1, Math.max(0, (price - safeLow) / span)) : 0.5;
    rows.push({
      symbol,
      base,
      price,
      changePct,
      high: safeHigh,
      low: safeLow,
      quoteVolume: Number.isFinite(quoteVolume) && quoteVolume > 0 ? quoteVolume : 0,
      rangePos,
      bias: biasOf(changePct, rangePos),
    });
  }
  rows.sort((a, b) => b.quoteVolume - a.quoteVolume);
  return rows;
}

export function readTicker(payload: unknown, symbol: string, at = Date.now()): Quote {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "Cours indisponible." };
  }
  const raw = payload as Record<string, unknown>;
  if (typeof raw.code === "number") {
    return { ok: false, error: "Cette paire n’est pas disponible dans les données de marché." };
  }
  const price = finiteNumber(raw.lastPrice);
  if (!(price > 0)) return { ok: false, error: "Cours indisponible." };
  const change = finiteNumber(raw.priceChangePercent);
  const volume = finiteNumber(raw.quoteVolume);
  return {
    ok: true,
    symbol,
    price,
    changePct: Number.isFinite(change) ? change : 0,
    high: positive(finiteNumber(raw.highPrice), price),
    low: positive(finiteNumber(raw.lowPrice), price),
    open: positive(finiteNumber(raw.openPrice), price),
    quoteVolume: Number.isFinite(volume) && volume > 0 ? volume : 0,
    bid: positive(finiteNumber(raw.bidPrice), price),
    ask: positive(finiteNumber(raw.askPrice), price),
    at,
  };
}
