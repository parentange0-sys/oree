import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Bias, MarketRow } from "@/lib/market";
import { formatPct, formatPrice, formatQuote } from "@/lib/format";
import { Button, cn } from "@/components/ui/button";
import { CoinLogo } from "@/components/coin-logo";

type SortMode = "volume" | "hausse" | "baisse" | "mouvement" | "veille";

const SORTS: { id: SortMode; label: string }[] = [
  { id: "volume", label: "Volume" },
  { id: "hausse", label: "Hausses" },
  { id: "baisse", label: "Baisses" },
  { id: "mouvement", label: "Mouvement" },
  { id: "veille", label: "Veille" },
];

const BIAS_LABEL: Record<Bias, string> = {
  hausse: "Hausse",
  baisse: "Baisse",
  range: "Range",
};

export function Screener({
  rows,
  selected,
  watched,
  onPick,
}: {
  rows: MarketRow[];
  selected: string;
  watched: Set<string>;
  onPick: (symbol: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("volume");
  const [limit, setLimit] = useState(40);

  const shown = useMemo(() => {
    const needle = query.trim().toUpperCase();
    let next = rows;
    if (needle) {
      next = next.filter((row) => row.symbol.includes(needle) || row.base.includes(needle));
    }
    if (sort === "veille") next = next.filter((row) => watched.has(row.symbol));
    const copy = [...next];
    if (sort === "hausse") copy.sort((a, b) => b.changePct - a.changePct);
    else if (sort === "baisse") copy.sort((a, b) => a.changePct - b.changePct);
    else if (sort === "mouvement")
      copy.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
    else copy.sort((a, b) => b.quoteVolume - a.quoteVolume);
    return copy;
  }, [rows, query, sort, watched]);

  const visible = shown.slice(0, limit);

  return (
    <section className="flex min-w-0 flex-col rounded-lg border border-border bg-surface">
      <div className="flex flex-col gap-3 border-b border-border p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium text-fg">Marché spot</h2>
            <p className="text-sm text-muted">{shown.length} paires USDT</p>
          </div>
        </div>
        <label className="relative block">
          <span className="sr-only">Chercher une crypto</span>
          <Search
            className="pointer-events-none absolute top-3 left-3 size-5 text-muted"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(40);
            }}
            placeholder="BTC, SOL, PEPE…"
            className="h-12 w-full rounded-xl border border-border bg-bg pr-3 pl-11 text-base text-fg placeholder:text-muted"
          />
        </label>
        <div className="min-w-0 overflow-x-auto">
          <div className="flex w-max gap-2 pb-1">
            {SORTS.map((item) => (
              <Button
                key={item.id}
                variant={sort === item.id ? "primary" : "ghost"}
                className="shrink-0 px-3 whitespace-nowrap"
                onClick={() => {
                  setSort(item.id);
                  setLimit(40);
                }}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <ul className="lg:max-h-[36rem] lg:overflow-y-auto">
        {visible.length === 0 ? (
          <li className="px-4 py-8 text-sm text-muted">Aucune paire ne correspond.</li>
        ) : (
          visible.map((row) => (
            <li key={row.symbol}>
              <button
                type="button"
                onClick={() => onPick(row.symbol)}
                className={cn(
                  "flex min-h-16 w-full items-center gap-3 border-b border-border px-4 py-3 text-left",
                  row.symbol === selected
                    ? "bg-surface-2 shadow-[inset_3px_0_0_var(--color-brass)]"
                    : "hover:bg-bg",
                )}
              >
                <CoinLogo base={row.base} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-fg">{row.base}</span>
                    <BiasPill bias={row.bias} />
                    {watched.has(row.symbol) ? (
                      <span
                        className="size-1.5 rounded-full bg-brass"
                        aria-label="Veille enregistrée"
                      />
                    ) : null}
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-xs text-muted">
                    <span>{formatQuote(row.quoteVolume)}</span>
                    <RangeMark pos={row.rangePos} />
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-base font-medium text-fg tabular-nums">
                    {formatPrice(row.price)}
                  </span>
                  <span
                    className={cn(
                      "text-sm tabular-nums",
                      row.changePct >= 0 ? "text-up" : "text-down",
                    )}
                  >
                    {formatPct(row.changePct)}
                  </span>
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
      {shown.length > limit ? (
        <div className="p-3">
          <Button className="w-full" onClick={() => setLimit((value) => value + 40)}>
            Voir {Math.min(40, shown.length - limit)} de plus
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function BiasPill({ bias }: { bias: Bias }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs",
        bias === "hausse" && "bg-up-dim text-up",
        bias === "baisse" && "bg-down-dim text-down",
        bias === "range" && "bg-bg text-muted",
      )}
    >
      {BIAS_LABEL[bias]}
    </span>
  );
}

function RangeMark({ pos }: { pos: number }) {
  const left = Math.min(100, Math.max(0, pos * 100));
  return (
    <span className="relative inline-block h-1 w-12 rounded-full bg-bg" aria-hidden="true">
      <span
        className="absolute top-[-2px] size-2 rounded-full bg-brass"
        style={{ left: `${left}%` }}
      />
    </span>
  );
}
