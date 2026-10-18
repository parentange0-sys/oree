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
    <section className="mb-4 rounded-lg border border-brass bg-surface p-4">
      <div className="flex items-center gap-4">
        <CoinLogo base={call.base} size="lg" priority />
        <div className="min-w-0 flex-1">
          <p className="text-xs tracking-widest text-brass uppercase">La crypto</p>
          <h2 className="truncate font-serif text-4xl text-fg">{call.base}</h2>
          <p className="text-sm text-muted">
            {call.name}
            <span className="mx-1 text-border">·</span>
            <span className="text-fg tabular-nums">{formatPrice(call.price)}</span>
            <span className={cn("ml-2 tabular-nums", call.changePct >= 0 ? "text-up" : "text-down")}>
              {formatPct(call.changePct)}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="font-serif text-4xl text-fg tabular-nums">{call.confidence} %</p>
          <p className="text-xs text-muted">confiance</p>
        </div>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-bg">
        <div className="h-1.5 rounded-full bg-brass" style={{ width: `${call.confidence}%` }} />
      </div>
      <div className="mt-4">
        <PlanStrip verdict={call.verdict} price={call.price} />
      </div>
      <p className="mt-3 text-sm text-fg">
        <span className="text-muted">Pourquoi. </span>
        {call.why}
      </p>
      <p className="mt-2 text-sm text-fg">
        <span className="text-muted">Conseil. </span>
        {call.advice}
      </p>
      <Button className="mt-4" variant="primary" onClick={() => onOpen(call.symbol)}>
        {selected ? `C’est ${call.base}` : `Ouvrir ${call.base}`}
      </Button>
    </section>
  );
}
