import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { RiskNotice } from "@/components/risk-notice";

export function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl px-4 pb-16">
      <header
        className="sticky top-0 z-20 -mx-4 mb-4 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur-md"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <p className="text-[11px] tracking-[0.16em] text-brass uppercase">
          <Link to="/" className="underline decoration-border underline-offset-2">
            Orée
          </Link>
        </p>
        <h1 className="font-serif text-3xl leading-none text-fg italic">{title}</h1>
      </header>
      <RiskNotice />
      <div className="mt-6 flex flex-col gap-6 text-base leading-relaxed text-fg">{children}</div>
    </div>
  );
}

export function FillIn({ children }: { children: string }) {
  return (
    <span className="mx-0.5 inline-flex rounded-lg border border-dashed border-brass/70 bg-brass/10 px-2 py-0.5 text-sm font-medium text-brass">
      À compléter — {children}
    </span>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-medium text-fg">{title}</h2>
      {children}
    </section>
  );
}
