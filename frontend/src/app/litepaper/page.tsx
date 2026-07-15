import Link from "next/link";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DownloadPdfButton } from "@/components/LitepaperDownload";
import { LITEPAPER_META, SECTIONS, parseRuns, type Block } from "@/content/litepaper";

export const metadata = {
  title: "Litepaper",
  description: "The Longbow protocol litepaper — leveraged longs on $LONG, in full.",
};

export default function Litepaper() {
  return (
    <main className="min-h-screen pb-24">
      <div className="no-print">
        <Header />
      </div>

      <div className="lp-page mx-auto max-w-6xl px-5">
        {/* Title block */}
        <section className="border-b border-[var(--color-border)] py-12 md:py-16">
          <div className="eyebrow">[ LITEPAPER ]</div>
          <h1 className="display mt-4 text-5xl md:text-6xl">
            THE LONGBOW <span className="text-[var(--color-long)]">LITEPAPER</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[var(--color-muted)]">{LITEPAPER_META.intro}</p>
          <div className="no-print mt-8 flex flex-wrap items-center gap-3">
            <DownloadPdfButton />
            <Link href="/dashboard" className="btn flex items-center gap-2 px-5 py-3">
              OPEN DASHBOARD <span>{"\u2192"}</span>
            </Link>
          </div>
          <div className="label mt-8 flex flex-wrap gap-x-6 gap-y-2">
            <span>{LITEPAPER_META.version}</span>
            <span>{LITEPAPER_META.chain}</span>
            <span>{LITEPAPER_META.status}</span>
          </div>
        </section>

        <div className="grid gap-10 py-10 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* TOC */}
          <aside className="lp-toc no-print hidden lg:block">
            <div className="sticky top-24">
              <div className="label mb-4">CONTENTS</div>
              <nav className="flex flex-col gap-2.5">
                {SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="flex gap-2.5 text-sm text-[var(--color-muted)] transition hover:text-[var(--color-long)]"
                  >
                    <span className="mono text-xs text-[var(--color-long)]">{s.n}</span>
                    {s.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Body */}
          <article className="lp-content max-w-3xl">
            {SECTIONS.map((s, i) => (
              <section
                key={s.id}
                id={s.id}
                className="lp-section scroll-mt-24 border-t border-[var(--color-border)] py-8 first:border-t-0 first:pt-0"
                style={i === 0 ? { borderTop: "none" } : undefined}
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="mono text-sm text-[var(--color-long)]">{s.n}</span>
                  <h2 className="display text-2xl md:text-3xl">{s.title}</h2>
                </div>
                <div className="space-y-4">
                  {s.blocks.map((b, j) => (
                    <BlockView key={j} block={b} />
                  ))}
                </div>
              </section>
            ))}
          </article>
        </div>
      </div>

      <div className="no-print">
        <Footer />
      </div>
    </main>
  );
}

function Inline({ text }: { text: string }) {
  return (
    <>
      {parseRuns(text).map((r, i) =>
        r.code ? (
          <code
            key={i}
            className="mono border border-[var(--color-border)] bg-[var(--color-bg)] px-1.5 py-0.5 text-[13px] text-[var(--color-fg)]"
          >
            {r.text}
          </code>
        ) : (
          <span key={i}>{r.text}</span>
        ),
      )}
    </>
  );
}

function BlockView({ block }: { block: Block }): ReactNode {
  switch (block.type) {
    case "p":
      return (
        <p className="text-[15px] leading-relaxed text-[var(--color-muted)]">
          <Inline text={block.text} />
        </p>
      );
    case "list":
      return (
        <ul className="space-y-2.5">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-[var(--color-muted)]">
              <span className="mono mt-0.5 flex-none text-xs text-[var(--color-long)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>
                <Inline text={it} />
              </span>
            </li>
          ))}
        </ul>
      );
    case "formula":
      return (
        <div className="mono border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-long)]">
          {block.text}
        </div>
      );
    case "callout":
      return (
        <div className="border border-[var(--color-border)] bg-[var(--color-bg)]">
          {block.title && (
            <div className="label border-b border-[var(--color-border)] px-4 py-2.5 text-[var(--color-long)]">
              {block.title}
            </div>
          )}
          <pre className="mono overflow-x-auto px-4 py-3 text-[12.5px] leading-relaxed text-[var(--color-fg)]">
            {block.lines.join("\n")}
          </pre>
        </div>
      );
  }
}
