import type { Call } from "@/lib/pick";
import { formatPct, formatPrice } from "@/lib/format";
import { Button, cn } from "@/components/ui/button";
import { CoinLogo } from "@/components/coin-logo";
import { PlanStrip } from "@/components/plan-strip";

export function PickCard({
  call,
  selected,
  onOpen,
}: {
  call: Call;
  selected: boolean;
  onOpen: (symbol: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-brass/50 bg-surface p-4">
      <div className="flex items-center gap-3">
        <CoinLogo base={call.base} size="lg" priority />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] tracking-[0.16em] text-brass uppercase">La crypto</p>
          <h2 className="truncate text-2xl font-medium text-fg">{call.base}</h2>
          <p className="truncate text-sm text-muted">{call.name}</p>
        </div>
        <p className="text-right">
          <span className="block text-lg font-medium text-fg tabular-nums">
            {call.confidence} %
          </span>
          <span className="text-xs text-muted">confiance</span>
        </p>
      </div>

      <p className="mt-4 flex flex-wrap items-baseline gap-x-2 font-serif text-[2.6rem] leading-none tracking-tight text-fg tabular-nums">
        <span>{formatPrice(call.price)}</span>
        <span className="font-sans text-base tracking-normal text-muted">USDT</span>
      </p>
      <p
        className={cn(
          "mt-2 text-base font-medium tabular-nums",
          call.changePct >= 0 ? "text-up" : "text-down",
        )}
      >
        {formatPct(call.changePct)}
        <span className="ml-1.5 font-normal text-muted">sur 24 h</span>
      </p>

      <div className="mt-4">
        <PlanStrip verdict={call.verdict} price={call.price} />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted">{call.why}</p>
      <p className="mt-2 text-sm leading-relaxed text-fg">{call.advice}</p>
      <Button
        className="mt-4 w-full sm:w-auto"
        variant="primary"
        onClick={() => onOpen(call.symbol)}
      >
        {selected ? `C’est ${call.base}` : `Ouvrir ${call.base}`}
      </Button>
    </section>
  );
}
