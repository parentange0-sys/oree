import { createServerFn } from "@tanstack/react-start";
import { displayName, nameOf } from "@/lib/coin-names";
import { baseOf, decodeEntities, finiteNumber, mapRows, readTicker } from "@/lib/market-parse";

export type Bias = "hausse" | "baisse" | "range";

export type MarketRow = {
  symbol: string;
  base: string;
  price: number;
  changePct: number;
  high: number;
  low: number;
  quoteVolume: number;
  rangePos: number;
  bias: Bias;
};

export type FearGreed = { value: number; label: string };

export type Trend = { symbol: string; name: string; pair: string | null };

export type MarketOk = {
  ok: true;
  updatedAt: number;
  rows: MarketRow[];
  fng: FearGreed | null;
  trending: Trend[];
};

export type MarketResult = MarketOk | { ok: false; error: string };

export type Quote =
  | {
      ok: true;
      symbol: string;
      price: number;
      changePct: number;
      high: number;
      low: number;
      open: number;
      quoteVolume: number;
      bid: number;
      ask: number;
      at: number;
    }
  | { ok: false; error: string };

export type Candle = { t: number; c: number };

export type Detail =
  | {
      ok: true;
      symbol: string;
      candles: Candle[];
      rsi: number | null;
      sma20: number | null;
      sma50: number | null;
      drift1h: number | null;
    }
  | { ok: false; error: string };

export type Article = {
  title: string;
  url: string;
  source: string;
  publishedAt: number;
};

export type SocialPost = {
  network: "Bluesky" | "Stocktwits";
  author: string;
  text: string;
  url: string;
  publishedAt: number;
  tone: "haussier" | "baissier" | null;
};

export type Intel = {
  ok: true;
  symbol: string;
  articles: Article[];
  social: SocialPost[];
  marketNews: Article[];
  notes: string[];
  updatedAt: number;
};

const FNG_FR: Record<string, string> = {
  "Extreme Fear": "Peur extrême",
  Fear: "Peur",
  Neutral: "Neutre",
  Greed: "Avidité",
  "Extreme Greed": "Avidité extrême",
};

// Public market-data hosts. The interface must not link to a trading venue.
const HOSTS = ["https://data-api.binance.vision", "https://api.binance.com"];

type CacheEntry<T> = { at: number; value: T };
const cache = new Map<string, CacheEntry<unknown>>();

function fromCache<T>(key: string, ttl: number): T | null {
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (!hit) return null;
  if (Date.now() - hit.at > ttl) return null;
  return hit.value;
}

function putCache<T>(key: string, value: T) {
  cache.set(key, { at: Date.now(), value });
}

function assertSymbol(symbol: string): string {
  const s = symbol.toUpperCase();
  if (!/^[A-Z0-9]{2,20}$/.test(s) || !s.endsWith("USDT")) {
    throw new Error("Paire invalide");
  }
  return s;
}

const FRESH_MARKET_MS = 12_000;
const FRESH_QUOTE_MS = 3_000;
const FRESH_DETAIL_MS = 30_000;
const KEPT_MS = 5 * 60_000;

async function fetchMarketJson(path: string, ms: number): Promise<unknown> {
  let last = "Les données de marché sont injoignables pour le moment.";
  for (const host of HOSTS) {
    try {
      const res = await fetch(host + path, {
        signal: AbortSignal.timeout(ms),
        headers: { accept: "application/json" },
      });
      if (!res.ok) {
        last = `La source de marché a répondu ${res.status}.`;
        continue;
      }
      return await res.json();
    } catch {
      last = "Les données de marché sont injoignables pour le moment.";
    }
  }
  throw new Error(last);
}

async function getJson(url: string, ms: number): Promise<unknown> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(ms),
    headers: {
      accept: "application/json",
      "user-agent": "Mozilla/5.0 (compatible; OreeDesk/1.0)",
    },
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

async function getText(url: string, ms: number): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(ms),
    headers: {
      accept: "application/rss+xml, application/xml, text/xml, */*",
      "user-agent": "Mozilla/5.0 (compatible; OreeDesk/1.0)",
    },
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.text();
}

function tagText(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = block.match(re);
  return match ? decodeEntities(match[1] ?? "") : "";
}

function safeUrl(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.toString();
  } catch {
    return null;
  }
  return null;
}

function parseRss(xml: string, fallbackSource: string): Article[] {
  const chunks = xml.split(/<item\b[^>]*>/i).slice(1);
  const articles: Article[] = [];
  for (const chunk of chunks) {
    if (articles.length >= 12) break;
    const body = chunk.split(/<\/item>/i)[0] ?? chunk;
    const title = tagText(body, "title");
    const url = safeUrl(tagText(body, "link"));
    if (!title || !url) continue;
    const source = tagText(body, "source") || fallbackSource;
    const publishedRaw =
      tagText(body, "pubDate") || tagText(body, "dc:date") || tagText(body, "updated");
    const publishedAt = Date.parse(publishedRaw);
    articles.push({
      title,
      url,
      source,
      publishedAt: Number.isFinite(publishedAt) ? publishedAt : 0,
    });
  }
  return articles;
}

function sma(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  let sum = 0;
  for (let i = closes.length - period; i < closes.length; i++) sum += closes[i] ?? 0;
  return sum / period;
}

function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const delta = (closes[i] ?? 0) - (closes[i - 1] ?? 0);
    if (delta >= 0) gain += delta;
    else loss -= delta;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const delta = (closes[i] ?? 0) - (closes[i - 1] ?? 0);
    const up = delta > 0 ? delta : 0;
    const down = delta < 0 ? -delta : 0;
    avgGain = (avgGain * (period - 1) + up) / period;
    avgLoss = (avgLoss * (period - 1) + down) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

async function loadFear(): Promise<FearGreed | null> {
  try {
    const payload = (await getJson("https://api.alternative.me/fng/?limit=1", 8000)) as {
      data?: { value?: string; value_classification?: string }[];
    };
    const row = payload.data?.[0];
    const value = finiteNumber(row?.value);
    if (!Number.isFinite(value)) return null;
    const label = FNG_FR[row?.value_classification ?? ""] ?? row?.value_classification ?? "Indice";
    return { value, label };
  } catch {
    return null;
  }
}

async function loadTrending(bases: Set<string>): Promise<Trend[]> {
  try {
    const payload = (await getJson("https://api.coingecko.com/api/v3/search/trending", 8000)) as {
      coins?: { item?: { symbol?: string; name?: string } }[];
    };
    const trends: Trend[] = [];
    for (const coin of payload.coins ?? []) {
      const symbol = coin.item?.symbol?.toUpperCase() ?? "";
      const name = coin.item?.name ?? symbol;
      if (!symbol) continue;
      trends.push({
        symbol,
        name,
        pair: bases.has(symbol) ? `${symbol}USDT` : null,
      });
      if (trends.length >= 8) break;
    }
    return trends;
  } catch {
    return [];
  }
}

async function loadMarket(): Promise<MarketOk> {
  const cached = fromCache<MarketOk>("market", FRESH_MARKET_MS);
  if (cached) return cached;
  try {
    const [ticker, fng] = await Promise.all([
      fetchMarketJson("/api/v3/ticker/24hr", 15_000),
      loadFear(),
    ]);
    const rows = mapRows(ticker);
    if (rows.length === 0) throw new Error("Aucune paire USDT reçue.");
    const bases = new Set(rows.map((row) => row.base));
    const trending = await loadTrending(bases);
    const value: MarketOk = { ok: true, updatedAt: Date.now(), rows, fng, trending };
    putCache("market", value);
    return value;
  } catch (error) {
    const stale = fromCache<MarketOk>("market", KEPT_MS);
    if (stale) return stale;
    throw error;
  }
}

async function loadQuote(symbol: string): Promise<Quote> {
  const key = `quote:${symbol}`;
  const cached = fromCache<Quote>(key, FRESH_QUOTE_MS);
  if (cached?.ok) return cached;
  try {
    const payload = await fetchMarketJson(`/api/v3/ticker/24hr?symbol=${symbol}`, 8_000);
    const quote = readTicker(payload, symbol);
    if (quote.ok) putCache(key, quote);
    return quote;
  } catch (error) {
    const stale = fromCache<Quote>(key, KEPT_MS);
    if (stale?.ok) return stale;
    throw error;
  }
}

async function loadDetail(symbol: string): Promise<Detail> {
  const key = `detail:${symbol}`;
  const cached = fromCache<Detail>(key, FRESH_DETAIL_MS);
  if (cached?.ok) return cached;
  let payload: unknown;
  try {
    payload = await fetchMarketJson(`/api/v3/klines?symbol=${symbol}&interval=1h&limit=80`, 8_000);
  } catch (error) {
    const stale = fromCache<Detail>(key, KEPT_MS);
    if (stale?.ok) return stale;
    throw error;
  }
  if (!Array.isArray(payload)) return { ok: false, error: "Graphique indisponible." };
  const candles: Candle[] = [];
  for (const row of payload) {
    if (!Array.isArray(row)) continue;
    const t = finiteNumber(row[0]);
    const c = finiteNumber(row[4]);
    if (Number.isFinite(t) && c > 0) candles.push({ t, c });
  }
  if (candles.length < 2) return { ok: false, error: "Pas assez de chandeliers." };
  const closes = candles.map((candle) => candle.c);
  const last = closes[closes.length - 1] ?? 0;
  const prev = closes[closes.length - 2] ?? last;
  const detail: Detail = {
    ok: true,
    symbol,
    candles: candles.slice(-48),
    rsi: rsi(closes),
    sma20: sma(closes, 20),
    sma50: sma(closes, 50),
    drift1h: prev > 0 ? ((last - prev) / prev) * 100 : null,
  };
  putCache(key, detail);
  return detail;
}

const FEEDS: { url: string; source: string }[] = [
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", source: "CoinDesk" },
  { url: "https://cointelegraph.com/rss", source: "Cointelegraph" },
  { url: "https://decrypt.co/feed", source: "Decrypt" },
  { url: "https://www.theblock.co/rss.xml", source: "The Block" },
];

function dedupeArticles(items: Article[]): Article[] {
  const seen = new Set<string>();
  const out: Article[] = [];
  for (const item of items) {
    const key = item.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  out.sort((a, b) => b.publishedAt - a.publishedAt);
  return out.slice(0, 16);
}

async function loadGeneralNews(): Promise<Article[]> {
  const cached = fromCache<Article[]>("news:general", 120_000);
  if (cached) return cached;
  const settled = await Promise.allSettled(
    FEEDS.map(async (feed) => parseRss(await getText(feed.url, 8000), feed.source)),
  );
  const articles = dedupeArticles(
    settled.flatMap((result) => (result.status === "fulfilled" ? result.value : [])),
  );
  if (articles.length > 0) putCache("news:general", articles);
  return articles;
}

async function loadGoogleNews(query: string): Promise<Article[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=fr&gl=FR&ceid=FR:fr`;
  return parseRss(await getText(url, 8000), "Google Actualités");
}

async function loadBluesky(query: string): Promise<SocialPost[]> {
  const url = `https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(query)}&limit=8&sort=latest`;
  const payload = (await getJson(url, 8000)) as {
    posts?: {
      uri?: string;
      author?: { handle?: string; displayName?: string };
      record?: { text?: string; createdAt?: string };
    }[];
  };
  const posts: SocialPost[] = [];
  for (const post of payload.posts ?? []) {
    const handle = post.author?.handle ?? "";
    const text = (post.record?.text ?? "").replace(/\s+/g, " ").trim();
    const rkey = post.uri?.split("/").pop() ?? "";
    if (!text || !/^[a-zA-Z0-9._:-]+$/.test(handle) || !rkey) continue;
    const publishedAt = Date.parse(post.record?.createdAt ?? "");
    posts.push({
      network: "Bluesky",
      author: post.author?.displayName || handle,
      text: text.slice(0, 320),
      url: `https://bsky.app/profile/${encodeURIComponent(handle)}/post/${encodeURIComponent(rkey)}`,
      publishedAt: Number.isFinite(publishedAt) ? publishedAt : 0,
      tone: null,
    });
  }
  return posts;
}

async function loadStocktwits(base: string): Promise<{ posts: SocialPost[]; missing: boolean }> {
  const url = `https://api.stocktwits.com/api/2/streams/symbol/${encodeURIComponent(base)}.X.json`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: {
      accept: "application/json",
      "user-agent": "Mozilla/5.0 (compatible; OreeDesk/1.0)",
    },
  });
  if (res.status === 404) return { posts: [], missing: true };
  if (!res.ok) throw new Error(String(res.status));
  const payload = (await res.json()) as {
    messages?: {
      id?: number;
      body?: string;
      created_at?: string;
      user?: { username?: string };
      entities?: { sentiment?: { basic?: string } | null };
    }[];
  };
  const posts: SocialPost[] = [];
  for (const message of payload.messages ?? []) {
    const username = message.user?.username ?? "";
    const text = (message.body ?? "").replace(/\s+/g, " ").trim();
    if (!text || !/^[A-Za-z0-9_]+$/.test(username)) continue;
    const basic = message.entities?.sentiment?.basic;
    const publishedAt = Date.parse(message.created_at ?? "");
    posts.push({
      network: "Stocktwits",
      author: username,
      text: text.slice(0, 320),
      url: `https://stocktwits.com/${encodeURIComponent(username)}`,
      publishedAt: Number.isFinite(publishedAt) ? publishedAt : 0,
      tone: basic === "Bullish" ? "haussier" : basic === "Bearish" ? "baissier" : null,
    });
    if (posts.length >= 8) break;
  }
  return { posts, missing: false };
}

async function loadIntel(symbol: string): Promise<Intel> {
  const key = `intel:${symbol}`;
  const cached = fromCache<Intel>(key, 60_000);
  if (cached) return cached;
  const base = baseOf(symbol);
  const name = nameOf(base);
  const query = name ? `"${name}" crypto` : `${base} crypto`;
  const notes: string[] = [];
  const [general, google, bluesky, stock] = await Promise.all([
    loadGeneralNews().catch(() => {
      notes.push("Les flux presse sont momentanément indisponibles.");
      return [] as Article[];
    }),
    loadGoogleNews(query).catch(() => {
      notes.push("Google Actualités n’a pas répondu pour cette crypto.");
      return [] as Article[];
    }),
    loadBluesky(name ?? base).catch(() => {
      notes.push("Bluesky est momentanément indisponible.");
      return [] as SocialPost[];
    }),
    loadStocktwits(base).catch(() => {
      notes.push("Stocktwits est momentanément indisponible.");
      return { posts: [] as SocialPost[], missing: false };
    }),
  ]);
  if (stock.missing) notes.push(`Pas de fil Stocktwits public pour ${base}.`);
  const keys = [base.toLowerCase(), name?.toLowerCase()].filter((item): item is string =>
    Boolean(item),
  );
  const related = general.filter((article) =>
    keys.some((needle) => article.title.toLowerCase().includes(needle)),
  );
  const intel: Intel = {
    ok: true,
    symbol,
    articles: dedupeArticles([...google, ...related]),
    social: [...bluesky, ...stock.posts].sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 12),
    marketNews: general.slice(0, 10),
    notes,
    updatedAt: Date.now(),
  };
  putCache(key, intel);
  return intel;
}

export const getMarket = createServerFn({ method: "GET" }).handler(
  async (): Promise<MarketResult> => {
    try {
      return await loadMarket();
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Impossible de lire les données de marché.",
      };
    }
  },
);

const symbolValidator = (data: { symbol: string }) => {
  if (!data || typeof data.symbol !== "string") throw new Error("Paire manquante");
  return { symbol: assertSymbol(data.symbol) };
};

export const getQuote = createServerFn({ method: "GET" })
  .validator(symbolValidator)
  .handler(async ({ data }): Promise<Quote> => {
    try {
      return await loadQuote(data.symbol);
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Cours indisponible.",
      };
    }
  });

export const getDetail = createServerFn({ method: "GET" })
  .validator(symbolValidator)
  .handler(async ({ data }): Promise<Detail> => {
    try {
      return await loadDetail(data.symbol);
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Analyse indisponible.",
      };
    }
  });

export const getIntel = createServerFn({ method: "GET" })
  .validator(symbolValidator)
  .handler(async ({ data }): Promise<Intel> => loadIntel(data.symbol));

export { displayName };
