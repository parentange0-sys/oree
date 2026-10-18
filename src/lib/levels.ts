export type HitKind = "stop" | "take";

export type Level = {
  stop: number | null;
  take: number | null;
  armed: boolean;
  hit: HitKind | null;
  hitAt: number | null;
  hitPrice: number | null;
};

export const SUGGESTED_STOP_PCT = -5;
export const SUGGESTED_TAKE_PCT = 6;

export const EMPTY_LEVEL: Level = Object.freeze({
  stop: null,
  take: null,
  armed: false,
  hit: null,
  hitAt: null,
  hitPrice: null,
});

const KEY = "oree-levels-v1";
export const LEVELS_EVENT = "oree-levels";

function storedPrice(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function parseLevel(raw: unknown): Level | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (value.stop != null && storedPrice(value.stop) == null) return null;
  if (value.take != null && storedPrice(value.take) == null) return null;
  const stop = storedPrice(value.stop);
  const take = storedPrice(value.take);
  const ordered = stop != null && take != null && stop < take;
  const hit = value.hit === "stop" || value.hit === "take" ? value.hit : null;
  const armed = value.armed === true && ordered;
  return {
    stop,
    take,
    armed,
    hit: armed ? hit : null,
    hitAt: typeof value.hitAt === "number" && Number.isFinite(value.hitAt) ? value.hitAt : null,
    hitPrice: storedPrice(value.hitPrice),
  };
}

export function parseLevels(raw: unknown): Record<string, Level> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, Level> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!/^[A-Z0-9]{2,20}$/.test(key) || !key.endsWith("USDT")) continue;
    const level = parseLevel(value);
    if (!level || (level.stop == null && level.take == null)) continue;
    out[key] = level;
  }
  return out;
}

export function readLevels(): Record<string, Level> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return parseLevels(JSON.parse(raw) as unknown);
  } catch {
    return {};
  }
}

export function writeLevel(symbol: string, level: Level): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    const all = readLevels();
    all[symbol] = level;
    localStorage.setItem(KEY, JSON.stringify(all));
    if (typeof window !== "undefined") window.dispatchEvent(new Event(LEVELS_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function detectHit(price: number, level: Level): HitKind | null {
  if (!level.armed || level.hit) return null;
  if (!(price > 0) || level.stop == null || level.take == null) return null;
  if (!(level.stop < level.take)) return null;
  if (price <= level.stop) return "stop";
  if (price >= level.take) return "take";
  return null;
}

export function watchError(
  price: number | null,
  stop: number | null,
  take: number | null,
): string | null {
  if (price == null || !(price > 0)) return "Le cours n’est pas encore arrivé.";
  if (stop == null || take == null) {
    return "Indiquez un stop et un gain d’arrêt, avec un point ou une virgule.";
  }
  if (!(stop < price && price < take)) {
    return "Position longue : le stop doit être sous le cours, le gain au-dessus.";
  }
  return null;
}
