export type HitKind = "stop" | "take";

export type Level = {
  stop: number | null;
  take: number | null;
  armed: boolean;
  hit: HitKind | null;
  hitAt: number | null;
  hitPrice: number | null;
};

export const EMPTY_LEVEL: Level = {
  stop: null,
  take: null,
  armed: false,
  hit: null,
  hitAt: null,
  hitPrice: null,
};

const KEY = "oree-levels-v1";
export const LEVELS_EVENT = "oree-levels";

export function readLevels(): Record<string, Level> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, Level>;
  } catch {
    return {};
  }
}

export function writeLevel(symbol: string, level: Level) {
  const all = readLevels();
  all[symbol] = level;
  localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new Event(LEVELS_EVENT));
}
