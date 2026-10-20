import { displayName } from "./coin-names.ts";
import { formatPct } from "./format.ts";
import type { MarketRow } from "./market.ts";

export type Verdict = "ouvert" | "neutre" | "ecarte";

export type Call = {
  symbol: string;
  base: string;
  name: string;
  price: number;
  changePct: number;
  verdict: Verdict;
  why: string;
  note: string;
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
  if (row.changePct >= 12 || (row.changePct >= 8 && row.rangePos > 0.88)) return "ecarte";
  if (row.changePct <= -6 || row.rangePos < 0.22) return "neutre";
  if (row.changePct >= -2.5 && row.changePct <= 7 && row.rangePos <= 0.86) return "ouvert";
  return "neutre";
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
  const bias = verdict === "ouvert" ? 10 : verdict === "ecarte" ? -18 : 0;
  return volume + momentum + place + bias;
}

function whyFor(row: MarketRow, verdict: Verdict): string {
  const name = displayName(row.base);
  const move = formatPct(row.changePct);
  if (verdict === "ecarte") {
    return `${name} a varié de ${move} sur 24 h. Le mouvement est déjà large, ou le cours est proche du plus haut de la séance. Le filtre écarte cette lecture.`;
  }
  if (verdict === "neutre") {
    return row.changePct < 0
      ? `${name} recule (${move}) et le cours reste dans le bas de la séance. Le filtre ne retient pas de lecture ouverte.`
      : `${name} bouge de ${move}, sans direction nette sur la séance. Le filtre reste neutre.`;
  }
  if (row.changePct >= 0) {
    return `${name} avance de ${move} sur 24 h. Les échanges sont fournis, et le cours n’est pas collé au plus haut de la séance.`;
  }
  return `${name} cède un peu (${move}). Le volume reste présent et la baisse de la séance n’est pas extrême.`;
}

function noteFor(verdict: Verdict): string {
  if (verdict === "ouvert") {
    return "Repère fixe, le même pour chaque paire : −5 % sous le cours et +6 % au-dessus. Illustration du filtre, pas une indication d’intervenir.";
  }
  if (verdict === "ecarte") {
    return "Aucune action n’est indiquée. Le repère −5 % / +6 % peut rester affiché à titre de comparaison, sans valoir invitation.";
  }
  return "Le filtre ne dégage pas de lecture ouverte. Le repère −5 % / +6 % est un calque fixe, pas une invitation à intervenir.";
}

export function callFor(row: MarketRow): Call {
  const verdict = verdictOf(row);
  return {
    symbol: row.symbol,
    base: row.base,
    name: displayName(row.base),
    price: row.price,
    changePct: row.changePct,
    verdict,
    why: whyFor(row, verdict),
    note: noteFor(verdict),
  };
}

export function bestCall(rows: MarketRow[]): Call | null {
  const pool = rows.filter(
    (row) => !isStable(row) && row.quoteVolume >= 8_000_000 && row.price > 0,
  );
  const usable =
    pool.length >= 5 ? pool : rows.filter((row) => !isStable(row) && row.quoteVolume >= 1_000_000);
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
  ouvert: "Ouverte",
  neutre: "Neutre",
  ecarte: "Écartée",
};
