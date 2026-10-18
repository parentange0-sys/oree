import { Clock, ShieldAlert, TrendingUp } from "lucide-react";
import type { Verdict } from "@/lib/pick";
import { WHEN_LABEL } from "@/lib/pick";
import { formatPct, formatPrice } from "@/lib/format";
import { cn } from "@/components/ui/button";

export function PlanStrip({ verdict, price }: { verdict: Verdict; price: number }) {
  const stop = price * 0.95;
  const win = price * 1.06;
  const whenClass = verdict === "prends" ? "text-up" : verdict === "laisse" ? "text-down" : "text-brass";

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <article className="rounded-lg bg-surface-2 px-3 py-3">
        <p className="flex items-center gap-2 text-xs text-brass">
          <Clock className="size-4" aria-hidden="true" />
          Quand investir
        </p>
        <p className={cn("mt-1 text-lg font-medium", whenClass)}>{WHEN_LABEL[verdict]}</p>
      </article>
      <article className="rounded-lg bg-down-dim px-3 py-3">
        <p className="flex items-center gap-2 text-xs text-down">
          <ShieldAlert className="size-4" aria-hidden="true" />
          Stop loss
        </p>
        <p className="mt-1 text-lg font-medium text-fg tabular-nums">{formatPrice(stop)}</p>
        <p className="text-xs text-down">−5 % · la perte s’arrête ici</p>
      </article>
      <article className="rounded-lg bg-up-dim px-3 py-3">
        <p className="flex items-center gap-2 text-xs text-up">
          <TrendingUp className="size-4" aria-hidden="true" />
          Gain
        </p>
        <p className="mt-1 text-lg font-medium text-fg tabular-nums">{formatPrice(win)}</p>
        <p className="text-xs text-up">+6 % · le win se prend ici</p>
      </article>
      <p className="text-sm text-muted sm:col-span-3">
        Win / loss : {formatPct(6)} de gain contre {formatPct(-5)} de stop loss. Tu risques 1 pour viser 1,2.
      </p>
    </div>
  );
}
