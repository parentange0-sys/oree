import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Detail, MarketRow, Quote } from "@/lib/market";
import { callFor } from "@/lib/pick";
import { formatPct, formatPrice, formatQuote, parsePx, toInput } from "@/lib/format";
import { writeLevel, type Level } from "@/lib/levels";
import { Button, cn } from "@/components/ui/button";
import { CoinLogo } from "@/components/coin-logo";
import { PlanStrip } from "@/components/plan-strip";

export function PositionPanel({
  symbol,
  row,
  quote,
  detail,
  level,
}: {
  symbol: string;
  row: MarketRow | undefined;
  quote: Quote | undefined;
  detail: Detail | undefined;
  level: Level;
}) {
  const live = quote?.ok ? quote : null;
  const price = live?.price ?? row?.price ?? null;
  const change = live?.changePct ?? row?.changePct ?? null;
  const base = symbol.slice(0, -4);
  const [stopText, setStopText] = useState("");
  const [takeText, setTakeText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const priced = price != null;
    setStopText(level.stop != null ? toInput(level.stop) : priced ? toInput(price * 0.95) : "");
    setTakeText(level.take != null ? toInput(level.take) : priced ? toInput(price * 1.06) : "");
    setFormError(null);
  }, [symbol, level.stop, level.take, price != null]);

  function save(armed: boolean) {
    if (price == null) {
      setFormError("Le cours n’est pas encore arrivé.");
      return;
    }
    const stop = parsePx(stopText);
    const take = parsePx(takeText);
    if (stop == null || take == null) {
      setFormError("Indiquez un stop et un gain d’arrêt, avec un point ou une virgule.");
      return;
    }
    if (!(stop < price && price < take)) {
      setFormError("Position longue : le stop doit être sous le cours, le gain au-dessus.");
      return;
    }
    writeLevel(symbol, {
      stop,
      take,
      armed,
      hit: null,
      hitAt: null,
      hitPrice: null,
    });
    setFormError(null);
    if (armed && typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }

  const stopN = parsePx(stopText);
  const takeN = parsePx(takeText);

  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <CoinLogo base={base} size="lg" priority />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">{row ? callFor(row).name : base}</p>
          <h2 className="font-serif text-3xl text-fg">{base}</h2>
        </div>
        <StatusChip level={level} />
      </div>

      <div>
        <p className="font-serif text-4xl text-fg tabular-nums">
          {price != null ? formatPrice(price) : "—"}
          <span className="ml-2 font-sans text-base text-muted">USDT</span>
        </p>
        {change != null ? (
          <p className={cn("mt-1 text-sm tabular-nums", change >= 0 ? "text-up" : "text-down")}>
            {formatPct(change)} sur 24 h
          </p>
        ) : null}
      </div>

      <Chart detail={detail} />
      {row ? <PlanStrip verdict={callFor(row).verdict} price={price ?? row.price} /> : null}
      {row ? <p className="text-sm text-muted">{callFor(row).why}</p> : null}

      {live ? (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Plus haut 24 h" value={formatPrice(live.high)} />
          <Stat label="Plus bas 24 h" value={formatPrice(live.low)} />
          <Stat label="Volume" value={formatQuote(live.quoteVolume)} />
          <Stat
            label="Écart achat / vente"
            value={
              live.price > 0 ? formatPct(((live.ask - live.bid) / live.price) * 100) : "—"
            }
          />
        </dl>
      ) : quote && !quote.ok ? (
        <p className="text-sm text-down">{quote.error}</p>
      ) : (
        <p className="text-sm text-muted">Lecture du cours…</p>
      )}

      <form
        className="flex flex-col gap-3 rounded-lg border border-border bg-bg p-3"
        onSubmit={(event) => {
          event.preventDefault();
          save(true);
        }}
      >
        <div>
          <h3 className="font-medium text-fg">Stop loss et gain</h3>
          <p className="text-sm text-muted">
            Le stop loss coupe la perte. Le gain prend le win. Aucun ordre n’est envoyé à Binance.
          </p>
        </div>
        <Field
          id="stop"
          label="Stop loss"
          hint="Si le cours tombe ici, tu sors. C’est la perte maximale."
          value={stopText}
          onChange={setStopText}
          tone="down"
          presets={[
            { label: "−2 %", apply: () => price && setStopText(toInput(price * 0.98)) },
            { label: "−5 %", apply: () => price && setStopText(toInput(price * 0.95)) },
            { label: "−8 %", apply: () => price && setStopText(toInput(price * 0.92)) },
          ]}
        />
        <Field
          id="take"
          label="Gain (win)"
          hint="Si le cours monte ici, tu prends le bénéfice."
          value={takeText}
          onChange={setTakeText}
          tone="up"
          presets={[
            { label: "+3 %", apply: () => price && setTakeText(toInput(price * 1.03)) },
            { label: "+6 %", apply: () => price && setTakeText(toInput(price * 1.06)) },
            { label: "+12 %", apply: () => price && setTakeText(toInput(price * 1.12)) },
          ]}
        />
        {price != null && stopN != null && takeN != null && stopN < takeN ? (
          <LevelRail stop={stopN} price={price} take={takeN} />
        ) : null}
        {formError ? <p className="text-sm text-down">{formError}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary">
            {level.armed ? "Mettre à jour la veille" : "Armer la veille"}
          </Button>
          <Button type="button" onClick={() => save(false)}>
            Enregistrer sans armer
          </Button>
          {level.armed || level.hit ? (
            <Button
              type="button"
              variant="quiet"
              onClick={() =>
                writeLevel(symbol, {
                  ...level,
                  armed: false,
                  hit: null,
                  hitAt: null,
                  hitPrice: null,
                })
              }
            >
              {level.hit ? "Acquitter" : "Désarmer"}
            </Button>
          ) : null}
        </div>
      </form>
    </section>
  );
}

function Field({
  id,
  label,
  hint,
  value,
  onChange,
  presets,
  tone,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  presets: { label: string; apply: () => void }[];
  tone: "up" | "down";
}) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-lg px-3 py-3", tone === "down" ? "bg-down-dim" : "bg-up-dim")}>
      <label htmlFor={id} className={cn("text-sm font-medium", tone === "down" ? "text-down" : "text-up")}>
        {label}
      </label>
      <p className="text-sm text-muted">{hint}</p>
      <input
        id={id}
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Prix USDT"
        className="h-11 rounded-lg border border-border bg-surface px-3 text-fg tabular-nums"
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
  const stopDist = ((stop - price) / price) * 100;
  const takeDist = ((take - price) / price) * 100;
  return (
    <div>
      <div className="relative h-2 rounded-full bg-surface-2">
        <div className="absolute top-0 h-2 rounded-full bg-brass" style={{ width: `${clamped}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted tabular-nums">
        <span>Stop loss {formatPct(stopDist)}</span>
        <span>Gain {formatPct(takeDist)}</span>
      </div>
    </div>
  );
}

function StatusChip({ level }: { level: Level }) {
  if (level.hit === "stop") return <span className="rounded-full bg-down-dim px-3 py-1 text-sm text-down">Stop loss touché</span>;
  if (level.hit === "take") return <span className="rounded-full bg-up-dim px-3 py-1 text-sm text-up">Gain touché</span>;
  if (level.armed) return <span className="rounded-full bg-surface-2 px-3 py-1 text-sm text-brass">Veille armée</span>;
  return <span className="rounded-full bg-surface-2 px-3 py-1 text-sm text-muted">Veille inactive</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-bg px-3 py-2">
      <dt className="text-muted">{label}</dt>
      <dd className="text-fg tabular-nums">{value}</dd>
    </div>
  );
}

function Chart({ detail }: { detail: Detail | undefined }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!detail) return <div className="h-44 rounded-lg bg-bg" />;
  if (!detail.ok) return <p className="text-sm text-muted">{detail.error}</p>;
  if (!ready) return <div className="h-44 rounded-lg bg-bg" />;
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
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
            fillOpacity={0.18}
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
