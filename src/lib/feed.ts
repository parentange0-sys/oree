export type FeedStatus = "loading" | "live" | "stale" | "offline" | "error";

export function feedStatus(input: {
  hasData: boolean;
  updatedAt: number | null;
  now: number;
  online: boolean;
  failed: boolean;
  freshMs: number;
}): FeedStatus {
  if (!input.online) return "offline";
  if (!input.hasData) return input.failed ? "error" : "loading";
  const age = input.updatedAt == null ? Number.POSITIVE_INFINITY : input.now - input.updatedAt;
  if (input.failed || age > input.freshMs) return "stale";
  return "live";
}

export function feedLabel(status: FeedStatus): string {
  switch (status) {
    case "loading":
      return "Chargement";
    case "live":
      return "En direct";
    case "stale":
      return "Périmé";
    case "offline":
      return "Hors ligne";
    case "error":
      return "Indisponible";
  }
}

export function unwrapOk<T extends { ok: true }>(result: T | { ok: false; error: string }): T {
  if (result.ok) return result;
  throw new Error(result.error);
}
