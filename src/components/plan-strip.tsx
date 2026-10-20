import { Clock, ShieldAlert, TrendingUp } from "lucide-react";
import type { Verdict } from "@/lib/pick";
import { WHEN_LABEL } from "@/lib/pick";
import { formatPct, formatPrice, formatRatio, movePrice } from "@/lib/format";
import { SUGGESTED_STOP_PCT, SUGGESTED_TAKE_PCT } from "@/lib/levels";
import { cn } from "@/components/ui/button";

export function PlanStrip({ verdict, price }: { verdict: Verdict; price: number }) {
  const stop = movePrice(price, SUGGESTED_STOP_PCT);
  const win = movePrice(price, SUGGESTED_TAKE_PCT);
  const whenClass =
    verdict === "ouvert" ? "text-up" : verdict === "ecarte" ? "text-down" : "text-brass";

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <article className="min-w-0 rounded-xl bg-surface-2 px-2.5 py-3">
          <p className="flex items-center gap-1.5 text-[11px] tracking-wide text-brass uppercase">
            <Clock className="size-3.5 shrink-0" aria-hidden="true" />
            Lecture
          </p>
          <p className={cn("mt-1 text-base leading-tight font-medium", whenClass)}>
            {WHEN_LABEL[verdict]}
          </p>
        </article>
        <article className="min-w-0 rounded-xl bg-down-dim px-2.5 py-3">
          <p className="flex items-center gap-1.5 text-[11px] tracking-wide text-down uppercase">
            <ShieldAlert className="size-3.5 shrink-0" aria-hidden="true" />
            Stop loss
          </p>
          <p className="mt-1 text-base leading-tight font-medium text-fg tabular-nums">
            {stop != null ? formatPrice(stop) : "—"}
          </p>
          <p className="text-xs text-down">−5 %</p>
        </article>
        <article className="min-w-0 rounded-xl bg-up-dim px-2.5 py-3">
          <p className="flex items-center gap-1.5 text-[11px] tracking-wide text-up uppercase">
            <TrendingUp className="size-3.5 shrink-0" aria-hidden="true" />
            Gain
          </p>
          <p className="mt-1 text-base leading-tight font-medium text-fg tabular-nums">
            {win != null ? formatPrice(win) : "—"}
          </p>
          <p className="text-xs text-up">+6 %</p>
        </article>
      </div>
      <p className="mt-2 text-sm text-muted">
        Repère fixe : {formatPct(SUGGESTED_TAKE_PCT)} au-dessus du cours,{" "}
        {formatPct(SUGGESTED_STOP_PCT)} en dessous, soit environ{" "}
        {formatRatio(SUGGESTED_TAKE_PCT, Math.abs(SUGGESTED_STOP_PCT))} pour 1. Illustration, pas un
        objectif personnel.
      </p>
    </div>
  );
}
