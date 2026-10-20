import { Link } from "@tanstack/react-router";

const linkClass = "text-fg underline decoration-border underline-offset-2";

export function RiskNotice() {
  return (
    <aside
      className="rounded-2xl border border-brass/40 bg-surface px-4 py-3"
      role="note"
      aria-label="Avertissement sur les crypto-actifs"
    >
      <p className="text-[11px] tracking-[0.16em] text-brass uppercase">Avertissement</p>
      <p className="mt-1 text-sm leading-relaxed text-fg">
        Les crypto-actifs sont volatils : la perte peut être totale. Orée affiche le résultat d’un
        filtre automatique, identique pour tout le monde. Ce n’est pas un conseil en investissement,
        ni une information personnalisée.
      </p>
      <p className="mt-2 text-sm">
        <Link to="/mentions-legales" className={linkClass}>
          Mentions légales
        </Link>
        <span className="mx-2 text-border" aria-hidden="true">
          ·
        </span>
        <Link to="/confidentialite" className={linkClass}>
          Confidentialité
        </Link>
      </p>
    </aside>
  );
}
