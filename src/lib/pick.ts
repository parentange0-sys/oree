import { displayName, type MarketRow } from "@/lib/market";
import { formatPct } from "@/lib/format";

export type Verdict = "prends" | "attends" | "laisse";

export type Call = {
  symbol: string;
  base: string;
  name: string;
  price: number;
  changePct: number;
  confidence: number;
  verdict: Verdict;
  why: string;
  advice: string;
};

const STABLES = new Set([
  "USDC",
  "FDUSD",
  "TUSD",
  "USDP",
  "DAI",
  "EUR",
  "USD1",
  "USDE",
  "RLUSD",
  "BFUSD",
  "PYUSD",
  "USDS",
  "AEUR",
  "EURI",
  "XUSD",
  "USDY",
  "GUSD",
  "FRAX",
  "LUSD",
  "CRVUSD",
  "USTC",
  "USD",
]);

function isStable(row: MarketRow): boolean {
  if (STABLES.has(row.base)) return true;
  return row.price > 0.98 && row.price < 1.02 && Math.abs(row.changePct) < 0.8;
}

function verdictOf(row: MarketRow): Verdict {
  if (row.changePct >= 12 || (row.changePct >= 8 && row.rangePos > 0.88)) return "laisse";
  if (row.changePct <= -6 || row.rangePos < 0.22) return "attends";
  if (row.changePct >= -2.5 && row.changePct <= 7 && row.rangePos <= 0.86) return "prends";
  return "attends";
}

function scoreOf(row: MarketRow, verdict: Verdict): number {
  const volume = Math.min(20, Math.max(0, Math.log10(Math.max(row.quoteVolume, 1)) * 2.4));
  let momentum = 8;
  if (row.changePct >= 0.8 && row.changePct <= 6) momentum = 40;
  else if (row.changePct > 6 && row.changePct <= 10) momentum = 16;
  else if (row.changePct >= -2.5 && row.changePct < 0.8) momentum = 24;
  else if (row.changePct >= -6 && row.changePct < -2.5) momentum = 10;
  let place = 10;
  if (row.rangePos >= 0.4 && row.rangePos <= 0.78) place = 25;
  else if (row.rangePos > 0.86) place = 6;
  const bias = verdict === "prends" ? 10 : verdict === "laisse" ? -18 : 0;
  return volume + momentum + place + bias;
}

function confidenceOf(score: number): number {
  return Math.max(48, Math.min(84, Math.round(40 + score * 0.5)));
}

function whyFor(row: MarketRow, verdict: Verdict): string {
  const name = displayName(row.base);
  const move = formatPct(row.changePct);
  if (verdict === "laisse") {
    return `${name} a déjà fait ${move} aujourd’hui. Le mouvement est parti, c’est trop tard pour courir après.`;
  }
  if (verdict === "attends") {
    return row.changePct < 0
      ? `${name} recule (${move}) et le cours n’a pas encore calmé. Pas le moment de forcer.`
      : `${name} bouge de ${move}, sans direction nette. Rien de clair pour entrer.`;
  }
  if (row.changePct >= 0) {
    return `${name} avance de ${move}, avec assez d’échanges, et elle n’est pas collée au plus haut du jour.`;
  }
  return `${name} cède un peu (${move}), mais le volume tient et la baisse n’est pas violente.`;
}

function adviceFor(verdict: Verdict): string {
  if (verdict === "prends") {
    return "Suis-la en position longue. Stop à −5 % du cours, gain à +6 %. Si ça s’emballe, tu n’en rajoutes pas.";
  }
  if (verdict === "laisse") {
    return "Passe ton tour. Acheter le haut, c’est le plus court chemin vers le stop.";
  }
  return "Tu ne fais rien. Tu attends que le cours se pose, et seulement après tu poses un stop.";
}

export function callFor(row: MarketRow): Call {
  const verdict = verdictOf(row);
  const score = scoreOf(row, verdict);
  return {
    symbol: row.symbol,
    base: row.base,
    name: displayName(row.base),
    price: row.price,
    changePct: row.changePct,
    confidence: confidenceOf(score),
    verdict,
    why: whyFor(row, verdict),
    advice: adviceFor(verdict),
  };
}

export function bestCall(rows: MarketRow[]): Call | null {
  const pool = rows.filter((row) => !isStable(row) && row.quoteVolume >= 8_000_000 && row.price > 0);
  const usable = pool.length >= 5 ? pool : rows.filter((row) => !isStable(row) && row.quoteVolume >= 1_000_000);
  if (usable.length === 0) return null;
  let best: { row: MarketRow; score: number } | null = null;
  for (const row of usable) {
    const verdict = verdictOf(row);
    const score = scoreOf(row, verdict);
    if (!best || score > best.score) best = { row, score };
  }
  return best ? callFor(best.row) : null;
}

export const WHEN_LABEL: Record<Verdict, string> = {
  prends: "Maintenant",
  attends: "Pas encore",
  laisse: "Ne pas entrer",
};
