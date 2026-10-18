import { createFileRoute } from "@tanstack/react-router";
import { MarketApp } from "@/components/market-app";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { s?: string } => {
    const raw = typeof search.s === "string" ? search.s.toUpperCase() : "";
    if (/^[A-Z0-9]{2,20}$/.test(raw) && raw.endsWith("USDT")) return { s: raw };
    return {};
  },
  head: ({ match }) => ({
    meta: [{ title: `${(match.search.s ?? "BTC").replace(/USDT$/, "")} · Orée` }],
  }),
  component: Home,
});

function Home() {
  const { s } = Route.useSearch();
  return <MarketApp symbol={s ?? "BTCUSDT"} />;
}
