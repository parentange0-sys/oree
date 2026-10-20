import { useEffect, useRef, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Detail, MarketRow, Quote } from "@/lib/market";
import { callFor } from "@/lib/pick";
import {
  distancePct,
  formatPct,
  formatPrice,
  formatQuote,
  movePrice,
  parsePx,
  spreadPct,
  toInput,
} from "@/lib/format";
import {
  SUGGESTED_STOP_PCT,
  SUGGESTED_TAKE_PCT,
  watchError,
  writeLevel,
  type Level,
} from "@/lib/levels";
import { Button, cn } from "@/components/ui/button";
import { CoinLogo } from "@/components/coin-logo";
import { PlanStrip } from "@/components/plan-strip";

type QuoteOk = Extract<Quote, { ok: true }>;
type DetailOk = Extract<Detail, { ok: true }>;

export function PositionPanel({
  symbol,
  row,
  quote,
  quoteError,
  detail,
  detailError,
  level,
}: {
  symbol: string;
  row: MarketRow | undefined;
  quote: QuoteOk | undefined;
  quoteError: string | null;
  detail: DetailOk | undefined;
  detailError: string | null;
  level: Level;
}) {
  const price = quote?.price ?? row?.price ?? null;
  const change = quote?.changePct ?? row?.changePct ?? null;
  const base = symbol.slice(0, -4);
  const call = row ? callFor(row) : null;
  const [stopText, setStopText] = useState("");
  const [takeText, setTakeText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const priceRef = useRef(price);
  priceRef.current = price;
  const hasPrice = price != null;

  useEffect(() => {
    const current = priceRef.current;
    const nextStop =
      level.stop != null
        ? level.stop
        : current != null
          ? movePrice(current, SUGGESTED_STOP_PCT)
          : null;
    const nextTake =
      level.take != null
        ? level.take
        : current != null
          ? movePrice(current, SUGGESTED_TAKE_PCT)
          : null;
    setStopText(nextStop != null ? toInput(nextStop) : "");
    setTakeText(nextTake != null ? toInput(nextTake) : "");
    setFormError(null);
  }, [symbol, level.stop, level.take, hasPrice]);

  function save(armed: boolean) {
    const stop = parsePx(stopText);
    const take = parsePx(takeText);
    const error = watchError(price, stop, take);
    if (error || price == null || stop == null || take == null) {
      setFormError(error ?? "Indiquez un stop et un gain d’arrêt, avec un point ou une virgule.");
      return;
    }
    const saved = writeLevel(symbol, {
      stop,
      take,
      armed,
      hit: null,
      hitAt: null,
      hitPrice: null,
    });
    if (!saved) {
      setFormError("Impossible d’enregistrer la veille sur cet appareil.");
      return;
    }
    setFormError(null);
    if (armed && typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission().catch(() => undefined);
    }
  }

  function clearWatch() {
    const saved = writeLevel(symbol, {
      ...level,
      armed: false,
      hit: null,
      hitAt: null,
      hitPrice: null,
    });
    if (!saved) setFormError("Impossible d’enregistrer la veille sur cet appareil.");
  }

  const stopN = parsePx(stopText);
  const takeN = parsePx(takeText);
  const stopDist = price != null && stopN != null ? distancePct(price, stopN) : null;
  const takeDist = price != null && takeN != null ? distancePct(price, takeN) : null;
  const spread = quote ? spreadPct(quote.bid, quote.ask, quote.price) : null;

  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <CoinLogo base={base} size="lg" priority />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">{call?.name ?? base}</p>
          <h2 className="text-2xl font-medium text-fg">{base}</h2>
        </div>
        <StatusChip level={level} />
      </div>

      <div>
        <p className="flex flex-wrap items-baseline gap-x-2 font-serif text-[2.75rem] leading-none tracking-tight text-fg tabular-nums">
          <span>{price != null ? formatPrice(price) : "—"}</span>
          <span className="font-sans text-base tracking-normal text-muted">USDT</span>
        </p>
        {change != null ? (
          <p
            className={cn(
              "mt-2 text-base font-medium tabular-nums",
              change >= 0 ? "text-up" : "text-down",
            )}
          >
            {formatPct(change)}
            <span className="ml-1.5 font-normal text-muted">sur 24 h</span>
          </p>
        ) : null}
        {quoteError ? <p className="mt-2 text-sm text-down">{quoteError}</p> : null}
        {!quote && !quoteError ? (
          <p className="mt-2 text-sm text-muted">Lecture du cours…</p>
        ) : null}
      </div>

      <form
        className="flex flex-col gap-3 rounded-2xl border border-border bg-bg p-3"
        onSubmit={(event) => {
          event.preventDefault();
          save(true);
        }}
      >
        <div>
          <h3 className="font-medium text-fg">Stop loss et gain</h3>
          <p className="text-sm text-muted">
            Ces niveaux restent sur cet appareil. Aucun ordre n’est transmis : une alerte s’affiche
            seulement si le cours les touche.
          </p>
        </div>
        <Field
          id="stop"
          label="Stop loss"
          hint="Niveau sous le cours. Une alerte s’affiche s’il est touché."
          value={stopText}
          onChange={setStopText}
          tone="down"
          distance={stopDist}
          presets={[
            { label: "−2 %", apply: () => applyMove(price, -2, setStopText) },
            { label: "−5 %", apply: () => applyMove(price, SUGGESTED_STOP_PCT, setStopText) },
            { label: "−8 %", apply: () => applyMove(price, -8, setStopText) },
          ]}
        />
        <Field
          id="take"
          label="Gain"
          hint="Niveau au-dessus du cours. Une alerte s’affiche s’il est touché."
          value={takeText}
          onChange={setTakeText}
          tone="up"
          distance={takeDist}
          presets={[
            { label: "+3 %", apply: () => applyMove(price, 3, setTakeText) },
            { label: "+6 %", apply: () => applyMove(price, SUGGESTED_TAKE_PCT, setTakeText) },
            { label: "+12 %", apply: () => applyMove(price, 12, setTakeText) },
          ]}
        />
        {price != null && stopN != null && takeN != null && stopN < takeN ? (
          <LevelRail stop={stopN} price={price} take={takeN} />
        ) : null}
        {formError ? (
          <p className="text-sm text-down" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          <Button type="submit" variant="primary" className="w-full">
            {level.armed ? "Mettre à jour la veille" : "Armer la veille"}
          </Button>
          <Button type="button" className="w-full" onClick={() => save(false)}>
            Enregistrer sans armer
          </Button>
          {level.armed || level.hit ? (
            <Button type="button" variant="quiet" className="w-full" onClick={clearWatch}>
              {level.hit ? "Acquitter" : "Désarmer"}
            </Button>
          ) : null}
        </div>
      </form>

      {quote ? (
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <Stat label="Plus haut 24 h" value={formatPrice(quote.high)} />
          <Stat label="Plus bas 24 h" value={formatPrice(quote.low)} />
          <Stat label="Volume" value={formatQuote(quote.quoteVolume)} />
          <Stat label="Écart achat / vente" value={spread != null ? formatPct(spread) : "—"} />
        </dl>
      ) : null}

      <Chart detail={detail} error={detailError} />
      {call ? <PlanStrip verdict={call.verdict} price={price ?? call.price} /> : null}
      {call ? <p className="text-sm leading-relaxed text-muted">{call.why}</p> : null}
      {call ? <p className="text-sm leading-relaxed text-muted">{call.note}</p> : null}
    </section>
  );
}

function applyMove(price: number | null, percent: number, setText: (value: string) => void) {
  if (price == null) return;
  const next = movePrice(price, percent);
  if (next != null) setText(toInput(next));
}

function Field({
  id,
  label,
  hint,
  value,
  onChange,
  presets,
  tone,
  distance,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  presets: { label: string; apply: () => void }[];
  tone: "up" | "down";
  distance: number | null;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl px-3 py-3",
        tone === "down" ? "bg-down-dim" : "bg-up-dim",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className={cn("text-sm font-medium", tone === "down" ? "text-down" : "text-up")}
        >
          {label}
        </label>
        {distance != null ? (
          <span
            className={cn(
              "text-sm font-medium tabular-nums",
              tone === "down" ? "text-down" : "text-up",
            )}
          >
            {formatPct(distance)}
          </span>
        ) : null}
      </div>
      <p id={`${id}-hint`} className="text-sm text-muted">
        {hint}
      </p>
      <input
        id={id}
        aria-describedby={`${id}-hint`}
        inputMode="decimal"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Prix USDT"
        className="h-12 rounded-xl border border-border bg-surface px-3 text-base text-fg tabular-nums"
      />
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Button key={preset.label} type="button" className="px-3" onClick={preset.apply}>
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function LevelRail({ stop, price, take }: { stop: number; price: number; take: number }) {
  const span = take - stop;
  const pos = span > 0 ? ((price - stop) / span) * 100 : 50;
  const clamped = Math.min(100, Math.max(0, pos));
  const stopDist = distancePct(price, stop);
  const takeDist = distancePct(price, take);
  return (
    <div>
      <div className="relative h-2 rounded-full bg-surface-2">
        <div
          className="absolute top-0 h-2 rounded-full bg-brass"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between gap-3 text-xs text-muted tabular-nums">
        <span>Stop {stopDist != null ? formatPct(stopDist) : "—"}</span>
        <span>Gain {takeDist != null ? formatPct(takeDist) : "—"}</span>
      </div>
    </div>
  );
}

function StatusChip({ level }: { level: Level }) {
  if (level.hit === "stop") {
    return (
      <span className="rounded-full bg-down-dim px-3 py-1 text-sm text-down">Stop touché</span>
    );
  }
  if (level.hit === "take") {
    return <span className="rounded-full bg-up-dim px-3 py-1 text-sm text-up">Gain touché</span>;
  }
  if (level.armed) {
    return (
      <span className="rounded-full bg-surface-2 px-3 py-1 text-sm text-brass">Veille armée</span>
    );
  }
  return <span className="rounded-full bg-surface-2 px-3 py-1 text-sm text-muted">Inactive</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-bg px-3 py-2">
      <dt className="text-muted">{label}</dt>
      <dd className="text-fg tabular-nums">{value}</dd>
    </div>
  );
}

function Chart({ detail, error }: { detail: DetailOk | undefined; error: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (error && !detail) return <p className="text-sm text-muted">{error}</p>;

  return (
    <div ref={ref} className="h-40 w-full min-w-0">
      {detail && width > 0 ? (
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={detail.candles}>
            <XAxis dataKey="t" hide />
            <YAxis domain={["auto", "auto"]} hide />
            <Tooltip
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                color: "var(--color-fg)",
              }}
              labelFormatter={(label) =>
                new Date(Number(label)).toLocaleString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              }
              formatter={(value) => [formatPrice(Number(value)), "Cours"]}
            />
            <Area
              type="monotone"
              dataKey="c"
              stroke="var(--color-brass)"
              fill="var(--color-brass)"
              fillOpacity={0.16}
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full rounded-xl bg-bg" />
      )}
    </div>
  );
}
