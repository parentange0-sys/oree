import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { getDetail, getIntel, getMarket, getQuote } from "@/lib/market";
import { formatPrice, formatQuote, formatTime } from "@/lib/format";
import { EMPTY_LEVEL, LEVELS_EVENT, readLevels, writeLevel, type HitKind, type Level } from "@/lib/levels";
import { Button, cn } from "@/components/ui/button";
import { Screener } from "@/components/screener";
import { PositionPanel } from "@/components/position-panel";
import { bestCall } from "@/lib/pick";
import { PickCard } from "@/components/pick-card";
import { IntelPanel } from "@/components/intel-panel";
import { CoinLogo } from "@/components/coin-logo";

type Tab = "marche" | "position" | "infos";

export function MarketApp({ symbol }: { symbol: string }) {
  const navigate = useNavigate({ from: "/" });
  const [tab, setTab] = useState<Tab>("marche");
  const [levels, setLevels] = useState<Record<string, Level>>({});
  const notified = useRef("");

  const market = useQuery({
    queryKey: ["market"],
    queryFn: () => getMarket(),
    refetchInterval: 20_000,
    staleTime: 10_000,
  });

  const quote = useQuery({
    queryKey: ["quote", symbol],
    queryFn: () => getQuote({ data: { symbol } }),
    refetchInterval: 5_000,
  });

  const detail = useQuery({
    queryKey: ["detail", symbol],
    queryFn: () => getDetail({ data: { symbol } }),
    refetchInterval: 60_000,
  });

  const intel = useQuery({
    queryKey: ["intel", symbol],
    queryFn: () => getIntel({ data: { symbol } }),
    refetchInterval: 90_000,
    staleTime: 60_000,
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
  const price = quote.data?.ok ? quote.data.price : null;

  useEffect(() => {
    if (!level.armed || level.hit || price == null || level.stop == null || level.take == null) return;
    let kind: HitKind | null = null;
    if (price <= level.stop) kind = "stop";
    else if (price >= level.take) kind = "take";
    if (!kind) return;
    const stamp = `${symbol}:${kind}:${Math.round(price * 1e8)}`;
    if (notified.current === stamp) return;
    notified.current = stamp;
    writeLevel(symbol, {
      ...level,
      hit: kind,
      hitAt: Date.now(),
      hitPrice: price,
    });
    chime(kind);
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const title = kind === "stop" ? `Stop touché · ${symbol}` : `Gain d’arrêt touché · ${symbol}`;
        new Notification(title, { body: `Cours ${formatPrice(price)} USDT` });
      }
    } catch {
      /* notifications unavailable */
    }
  }, [level, price, symbol]);

  const snapshot = market.data?.ok ? market.data : null;
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

  function pick(next: string) {
    void navigate({ search: { s: next } });
    setTab("position");
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-5">
      <header className="mb-5 flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs tracking-widest text-brass uppercase">Veille spot</p>
          <h1 className="font-serif text-4xl text-fg italic">Orée</h1>
          <p className="text-sm text-muted">Quand investir, le stop loss, et le gain.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {snapshot?.fng ? (
            <span className="rounded-full border border-border px-3 py-2 text-sm text-fg">
              Fear & Greed {snapshot.fng.value} · {snapshot.fng.label}
            </span>
          ) : null}
          <span className="text-sm text-muted tabular-nums">
            en direct{" "}
            {quote.data?.ok
              ? formatTime(quote.data.at)
              : snapshot
                ? formatTime(snapshot.updatedAt)
                : ""}
          </span>
        </div>
      </header>

      {level.hit && price != null ? (
        <div
          role="status"
          className={cn(
            "oree-pulse mb-4 rounded-lg px-4 py-3 text-sm",
            level.hit === "stop" ? "bg-down-dim text-down" : "bg-up-dim text-up",
          )}
        >
          {level.hit === "stop" ? "Stop loss touché" : "Gain d’arrêt touché"} sur {base} à{" "}
          {formatPrice(level.hitPrice ?? price)} USDT. La veille reste affichée jusqu’à acquittement.
        </div>
      ) : null}

      {market.isPending ? (
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-fg">Ouverture des cours Binance…</p>
          <p className="mt-1 text-sm text-muted">La page reste là, les prix arrivent dans un instant.</p>
        </div>
      ) : !snapshot ? (
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-fg">Les cours Binance ne répondent pas.</p>
          <p className="mt-1 text-sm text-muted">{market.data && !market.data.ok ? market.data.error : "Réessayez."}</p>
          <Button className="mt-3" variant="primary" onClick={() => void market.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : (
        <>
          {best ? (
            <PickCard call={best} selected={best.symbol === symbol} onOpen={pick} />
          ) : null}
          <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Figure label="Paires USDT" value={String(snapshot.rows.length)} />
            <Figure label="En hausse" value={String(up)} tone="up" />
            <Figure label="En baisse" value={String(down)} tone="down" />
            <Figure label="Volume 24 h" value={formatQuote(volume)} />
          </dl>

          {snapshot.trending.length > 0 ? (
            <div className="mb-4 flex min-w-0 gap-2 overflow-x-auto pb-1">
              {snapshot.trending.map((trend) => (
                <button
                  key={trend.symbol}
                  type="button"
                  disabled={!trend.pair}
                  onClick={() => trend.pair && pick(trend.pair)}
                  className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm text-fg disabled:opacity-50"
                >
                  <CoinLogo base={trend.symbol} size="sm" />
                  {trend.name}
                  <span className="ml-2 text-muted">{trend.symbol}</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="mb-4 flex gap-2 lg:hidden">
            {(
              [
                ["marche", "Marché"],
                ["position", "Position"],
                ["infos", "Actus"],
              ] as const
            ).map(([id, label]) => (
              <Button key={id} variant={tab === id ? "primary" : "ghost"} className="flex-1 px-2" onClick={() => setTab(id)}>
                {label}
              </Button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className={tab === "marche" ? "" : "hidden lg:block"}>
              <Screener rows={snapshot.rows} selected={symbol} watched={watched} onPick={pick} />
            </div>
            <div className={tab === "position" ? "" : "hidden lg:block"}>
              <PositionPanel
                symbol={symbol}
                row={row}
                quote={quote.data}
                detail={detail.data}
                level={level}
              />
            </div>
          </div>

          <div className={cn("mt-4", tab === "infos" ? "" : "hidden lg:block")}>
            <IntelPanel base={base} intel={intel.data} loading={intel.isLoading} />
          </div>
        </>
      )}

      <footer className="mt-6 pb-4 text-xs text-muted">
        Cours : API publique Binance, spot USDT. Le stop et le gain d’arrêt restent sur cet appareil et
        ne passent aucun ordre. Lecture automatique, pas un conseil en investissement.
      </footer>
    </div>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={cn("text-lg font-medium tabular-nums", tone === "up" && "text-up", tone === "down" && "text-down")}>
        {value}
      </dd>
    </div>
  );
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
