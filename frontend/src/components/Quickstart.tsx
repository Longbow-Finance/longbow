"use client";

import { useState } from "react";

const REPO_URL = "https://github.com/Longbow-Protocol/longbow";

type Line =
  | { kind: "comment"; text: string }
  | { kind: "cmd"; text: string }
  | { kind: "out"; text: string };

const LINES: Line[] = [
  { kind: "comment", text: "# 1 · grab the source from github" },
  { kind: "cmd", text: "git clone https://github.com/Longbow-Protocol/longbow.git" },
  { kind: "comment", text: "# 2 · hop into the cli" },
  { kind: "cmd", text: "cd longbow/cli" },
  { kind: "comment", text: "# 3 · launch it — no build step, keys stay on your machine" },
  { kind: "cmd", text: "npx longbow-cli" },
  { kind: "out", text: "  › connected to robinhood chain · signing locally" },
];

const ALL_COMMANDS = LINES.filter((l) => l.kind === "cmd").map((l) => l.text).join("\n");

export function Quickstart() {
  return (
    <section id="start" className="py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">[ QUICKSTART ]</div>
          <h2 className="display mt-3 text-3xl md:text-4xl">Up and running in 30 seconds.</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--color-muted)]">
            Longbow is self-custodial and runs entirely on your machine. Clone the repo, launch the
            CLI, and you&apos;re trading from the terminal — no account, no backend, no key ever
            leaves your computer.
          </p>
        </div>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary flex flex-none items-center gap-2 px-5 py-3"
        >
          <GitHubIcon />
          VIEW ON GITHUB <span>{"\u2192"}</span>
        </a>
      </div>

      <Terminal />
    </section>
  );
}

function Terminal() {
  const [copied, setCopied] = useState(false);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(ALL_COMMANDS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-panel)]">
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-panel-2)] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 bg-[var(--color-border-bright)]" />
            <span className="h-2.5 w-2.5 bg-[var(--color-border-bright)]" />
            <span className="h-2.5 w-2.5 bg-[var(--color-long)]" />
          </div>
          <span className="label">longbow — bash</span>
        </div>
        <button
          onClick={copyAll}
          className="label flex items-center gap-1.5 text-[var(--color-muted)] transition hover:text-[var(--color-long)]"
          aria-label="Copy all commands"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "COPIED" : "COPY ALL"}
        </button>
      </div>

      {/* Body */}
      <div className="mono overflow-x-auto px-5 py-5 text-sm leading-7">
        {LINES.map((l, i) => (
          <TermLine key={i} line={l} />
        ))}
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[var(--color-long)]">$</span>
          <span className="inline-block h-4 w-2 animate-pulse bg-[var(--color-long)]" aria-hidden />
        </div>
      </div>
    </div>
  );
}

function TermLine({ line }: { line: Line }) {
  if (line.kind === "comment") {
    return <div className="text-[var(--color-muted)]">{line.text}</div>;
  }
  if (line.kind === "out") {
    return <div className="text-[var(--color-long-dim)]">{line.text}</div>;
  }
  return (
    <div className="group flex items-center gap-2">
      <span className="flex-none text-[var(--color-long)]">$</span>
      <span className="text-[var(--color-fg)]">{line.text}</span>
      <CopyInline text={line.text} />
    </div>
  );
}

function CopyInline({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <button
      onClick={copy}
      aria-label="Copy command"
      title="Copy command"
      className="flex-none text-[var(--color-muted)] opacity-0 transition hover:text-[var(--color-long)] focus:opacity-100 group-hover:opacity-100"
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.36-3.88-1.36-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.26 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="9" y="9" width="11" height="11" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
