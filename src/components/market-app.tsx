import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { getDetail, getIntel, getMarket, getQuote } from "@/lib/market";
import { formatPrice, formatQuote, formatTime } from "@/lib/format";
import { feedLabel, feedStatus, unwrapOk, type FeedStatus } from "@/lib/feed";
import {
  EMPTY_LEVEL,
  LEVELS_EVENT,
  detectHit,
  readLevels,
  writeLevel,
  type HitKind,
  type Level,
} from "@/lib/levels";
import { useNow, useOnline } from "@/lib/use-clock";
import { Button, cn } from "@/components/ui/button";
import { Screener } from "@/components/screener";
import { PositionPanel } from "@/components/position-panel";
import { bestCall } from "@/lib/pick";
import { PickCard } from "@/components/pick-card";
import { IntelPanel } from "@/components/intel-panel";
import { CoinLogo } from "@/components/coin-logo";

type Tab = "marche" | "position" | "infos";

const QUOTE_FRESH_MS = 15_000;
const MARKET_FRESH_MS = 45_000;

export function MarketApp({ symbol }: { symbol: string }) {
  const navigate = useNavigate({ from: "/" });
  const [tab, setTab] = useState<Tab>("marche");
  const [levels, setLevels] = useState<Record<string, Level>>({});
  const notified = useRef("");
  const now = useNow();
  const online = useOnline();

  const market = useQuery({
    queryKey: ["market"],
    queryFn: async () => unwrapOk(await getMarket()),
    refetchInterval: 20_000,
    staleTime: 10_000,
    retry: 2,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const quote = useQuery({
    queryKey: ["quote", symbol],
    queryFn: async () => unwrapOk(await getQuote({ data: { symbol } })),
    refetchInterval: 5_000,
    staleTime: 2_000,
    retry: 2,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const detail = useQuery({
    queryKey: ["detail", symbol],
    queryFn: async () => unwrapOk(await getDetail({ data: { symbol } })),
    refetchInterval: 60_000,
    retry: 1,
    refetchOnReconnect: true,
  });

  const intel = useQuery({
    queryKey: ["intel", symbol],
    queryFn: () => getIntel({ data: { symbol } }),
    refetchInterval: 90_000,
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    const sync = () => setLevels(readLevels());
    sync();
    window.addEventListener(LEVELS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(LEVELS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const level = levels[symbol] ?? EMPTY_LEVEL;
  const price = quote.data?.price ?? null;
  const quoteFresh =
    online && quote.data != null && !quote.isError && now - quote.data.at <= QUOTE_FRESH_MS;

  useEffect(() => {
    if (!quoteFresh || price == null) return;
    const kind = detectHit(price, level);
    if (!kind) return;
    const stamp = `${symbol}:${kind}:${Math.round(price * 1e8)}`;
    if (notified.current === stamp) return;
    const saved = writeLevel(symbol, {
      ...level,
      hit: kind,
      hitAt: Date.now(),
      hitPrice: price,
    });
    if (!saved) return;
    notified.current = stamp;
    chime(kind);
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const title =
          kind === "stop" ? `Stop touché · ${symbol}` : `Gain d’arrêt touché · ${symbol}`;
        new Notification(title, { body: `Cours ${formatPrice(price)} USDT` });
      }
    } catch {
      /* notifications unavailable */
    }
  }, [level, price, quoteFresh, symbol]);

  const snapshot = market.data ?? null;
  const row = useMemo(
    () => snapshot?.rows.find((item) => item.symbol === symbol),
    [snapshot, symbol],
  );
  const watched = useMemo(() => {
    const set = new Set<string>();
    for (const [key, value] of Object.entries(levels)) {
      if (value.stop != null || value.take != null) set.add(key);
    }
    return set;
  }, [levels]);

  const up = snapshot?.rows.filter((item) => item.changePct > 0).length ?? 0;
  const down = snapshot?.rows.filter((item) => item.changePct < 0).length ?? 0;
  const volume = snapshot?.rows.reduce((sum, item) => sum + item.quoteVolume, 0) ?? 0;
  const base = symbol.slice(0, -4);
  const best = snapshot ? bestCall(snapshot.rows) : null;
  const status = quote.data
    ? feedStatus({
        hasData: true,
        updatedAt: quote.data.at,
        now,
        online,
        failed: quote.isError,
        freshMs: QUOTE_FRESH_MS,
      })
    : feedStatus({
        hasData: Boolean(snapshot),
        updatedAt: snapshot?.updatedAt ?? null,
        now,
        online,
        failed: market.isError,
        freshMs: MARKET_FRESH_MS,
      });
  const stampedAt = quote.data?.at ?? snapshot?.updatedAt ?? null;
  const notice = [
    status === "offline" ? "Hors ligne. Dernier cours conservé." : null,
    status === "stale" ? "Cours périmé. Dernière valeur conservée." : null,
    level.armed && !level.hit && !quoteFresh && !market.isPending
      ? "La veille est en pause."
      : null,
  ].filter((item): item is string => Boolean(item));

  function pick(next: string) {
    void navigate({ search: { s: next } });
    setTab("position");
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-28 lg:pb-8">
      <header
        className="sticky top-0 z-20 -mx-4 mb-4 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur-md"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.16em] text-brass uppercase">Veille spot</p>
            <h1 className="font-serif text-3xl leading-none text-fg italic">Orée</h1>
            <p className="mt-1 text-sm text-muted">Quand investir, le stop loss, et le gain.</p>
          </div>
          <StatusPill status={status} at={stampedAt} />
        </div>
        {snapshot?.fng ? (
          <p className="mt-2 text-xs text-muted">
            Fear &amp; Greed {snapshot.fng.value} · {snapshot.fng.label}
          </p>
        ) : null}
      </header>

      {level.hit && price != null ? (
        <div
          role="status"
          className={cn(
            "oree-pulse mb-4 rounded-xl px-4 py-3 text-sm",
            level.hit === "stop" ? "bg-down-dim text-down" : "bg-up-dim text-up",
          )}
        >
          {level.hit === "stop" ? "Stop loss touché" : "Gain d’arrêt touché"} sur {base} à{" "}
          {formatPrice(level.hitPrice ?? price)} USDT. La veille reste affichée jusqu’à
          acquittement.
        </div>
      ) : null}

      {snapshot && notice.length > 0 ? (
        <p
          role="status"
          className="mb-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-fg"
        >
          {notice.join(" ")}
        </p>
      ) : null}

      {market.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-3">
          <div className="oree-skeleton h-64 rounded-2xl" />
          <div className="oree-skeleton h-24 rounded-2xl" />
          <p className="text-sm text-muted">Ouverture des cours Binance…</p>
        </div>
      ) : !snapshot ? (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-lg text-fg">
            {online ? "Les cours Binance ne répondent pas." : "Hors ligne."}
          </p>
          <p className="mt-1 text-sm text-muted">
            {online
              ? errorText(market.error)
              : "Les cours reviendront avec le réseau. Rien n’est envoyé à Binance."}
          </p>
          <Button className="mt-4" variant="primary" onClick={() => void market.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : (
        <>
          <div className={cn("min-w-0", tab === "marche" ? "" : "hidden lg:block")}>
            {best ? (
              <div className="mb-4">
                <PickCard call={best} selected={best.symbol === symbol} onOpen={pick} />
              </div>
            ) : null}
            <p className="mb-4 text-sm text-muted tabular-nums">
              <span className="text-fg">{snapshot.rows.length}</span> paires
              <span className="mx-2 text-border">·</span>
              <span className="text-up">{up} en hausse</span>
              <span className="mx-2 text-border">·</span>
              <span className="text-down">{down} en baisse</span>
              <span className="mx-2 text-border">·</span>
              <span>{formatQuote(volume)}</span>
            </p>

            {snapshot.trending.length > 0 ? (
              <div className="mb-4 grid grid-cols-1">
                <div className="flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-1">
                  {snapshot.trending.map((trend) => (
                    <button
                      key={trend.symbol}
                      type="button"
                      disabled={!trend.pair}
                      onClick={() => trend.pair && pick(trend.pair)}
                      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm whitespace-nowrap text-fg disabled:opacity-50"
                    >
                      <CoinLogo base={trend.symbol} size="sm" />
                      {trend.name}
                      <span className="text-muted">{trend.symbol}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className={cn("min-w-0", tab === "marche" ? "" : "hidden lg:block")}>
              <Screener rows={snapshot.rows} selected={symbol} watched={watched} onPick={pick} />
            </div>
            <div className={cn("min-w-0", tab === "position" ? "" : "hidden lg:block")}>
              <PositionPanel
                symbol={symbol}
                row={row}
                quote={quote.data}
                quoteError={quote.isError ? errorText(quote.error) : null}
                detail={detail.data}
                detailError={detail.isError && !detail.data ? errorText(detail.error) : null}
                level={level}
              />
            </div>
          </div>

          <div className={cn("mt-4", tab === "infos" ? "" : "hidden lg:block")}>
            <IntelPanel base={base} intel={intel.data} loading={intel.isLoading} />
          </div>

          <nav
            className="oree-tabbar fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 backdrop-blur-md lg:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            aria-label="Sections"
          >
            <div className="mx-auto flex max-w-6xl">
              {(
                [
                  ["marche", "Marché"],
                  ["position", "Position"],
                  ["infos", "Actus"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-current={tab === id ? "page" : undefined}
                  className={cn(
                    "min-h-12 flex-1 border-t-2 text-sm font-medium",
                    tab === id ? "border-brass text-brass" : "border-transparent text-muted",
                  )}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </nav>
        </>
      )}

      <footer className="mt-6 pb-2 text-xs leading-relaxed text-muted">
        <p>
          Cours : API publique Binance, spot USDT. Le stop et le gain restent sur cet appareil et ne
          passent aucun ordre. Lecture automatique, pas un conseil en investissement.
        </p>
        <p className="mt-2">
          <a
            className="text-fg underline decoration-border underline-offset-2"
            href="/?install=1&platform=ios"
          >
            Ajouter à l’écran d’accueil
          </a>
        </p>
      </footer>
    </div>
  );
}

function StatusPill({ status, at }: { status: FeedStatus; at: number | null }) {
  const tone =
    status === "live"
      ? "text-up"
      : status === "stale"
        ? "text-brass"
        : status === "loading"
          ? "text-muted"
          : "text-down";
  return (
    <p
      role="status"
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs",
        tone,
      )}
    >
      {status === "live" ? (
        <span className="live-dot" aria-hidden="true" />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "size-2 rounded-full",
            status === "stale" && "bg-brass",
            status === "loading" && "bg-muted",
            (status === "offline" || status === "error") && "bg-down",
          )}
        />
      )}
      <span>{feedLabel(status)}</span>
      {at != null && status !== "loading" && status !== "error" ? (
        <span className="text-muted tabular-nums">{formatTime(at)}</span>
      ) : null}
    </p>
  );
}

function errorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Impossible de lire Binance.";
}

function chime(kind: HitKind) {
  try {
    const audio = new AudioContext();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.value = kind === "stop" ? 196 : 659;
    oscillator.connect(gain);
    gain.connect(audio.destination);
    gain.gain.setValueAtTime(0.04, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.35);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.35);
  } catch {
    /* autoplay may be blocked */
  }
}
