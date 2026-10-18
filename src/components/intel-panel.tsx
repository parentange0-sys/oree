import type { Article, Intel, SocialPost } from "@/lib/market";
import { formatAgo } from "@/lib/format";
import { cn } from "@/components/ui/button";

export function IntelPanel({
  base,
  intel,
  loading,
}: {
  base: string;
  intel: Intel | undefined;
  loading: boolean;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-4">
        <h2 className="font-serif text-2xl text-fg">Fil réel</h2>
        <p className="text-sm text-muted">
          Presse (CoinDesk, Cointelegraph, Decrypt, The Block, Google Actualités) et réseaux publics
          (Bluesky, Stocktwits). X / Twitter n’a pas d’accès public.
        </p>
      </div>
      {loading && !intel ? <p className="text-sm text-muted">Chargement des actus…</p> : null}
      {intel ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Feed title={`Autour de ${base}`} articles={intel.articles} empty="Rien de récent sur cette crypto." />
          <SocialFeed posts={intel.social} />
          <Feed title="Marché" articles={intel.marketNews} empty="Les flux presse n’ont rien renvoyé." />
          {intel.notes.length > 0 ? (
            <ul className="lg:col-span-3">
              {intel.notes.map((note) => (
                <li key={note} className="text-sm text-muted">
                  {note}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Feed({ title, articles, empty }: { title: string; articles: Article[]; empty: string }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-3 text-sm font-medium text-fg">{title}</h3>
      {articles.length === 0 ? <p className="text-sm text-muted">{empty}</p> : null}
      <ul className="flex flex-col gap-3">
        {articles.map((article) => (
          <li key={article.url}>
            <a
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg bg-bg px-3 py-3 hover:bg-surface-2"
            >
              <span className="block text-sm text-fg">{article.title}</span>
              <span className="mt-1 block text-xs text-muted">
                {article.source}
                {article.publishedAt ? ` · ${formatAgo(article.publishedAt)}` : ""}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialFeed({ posts }: { posts: SocialPost[] }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-3 text-sm font-medium text-fg">Réseaux</h3>
      {posts.length === 0 ? <p className="text-sm text-muted">Aucun message public pour l’instant.</p> : null}
      <ul className="flex flex-col gap-3">
        {posts.map((post) => (
          <li key={`${post.network}-${post.url}-${post.publishedAt}`}>
            <a
              href={post.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg bg-bg px-3 py-3 hover:bg-surface-2"
            >
              <span className="flex items-center justify-between gap-2 text-xs text-muted">
                <span>
                  {post.network} · {post.author}
                </span>
                {post.tone ? (
                  <span className={cn(post.tone === "haussier" ? "text-up" : "text-down")}>{post.tone}</span>
                ) : null}
              </span>
              <span className="mt-1 block text-sm text-fg">{post.text}</span>
              {post.publishedAt ? (
                <span className="mt-1 block text-xs text-muted">{formatAgo(post.publishedAt)}</span>
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
