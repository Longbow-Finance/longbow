import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-[var(--color-border)]">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center bg-[var(--color-long)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/longbow-icon.png" alt="Longbow" className="h-6 w-6 object-contain" />
              </div>
              <div className="leading-none">
                <div className="text-base font-bold tracking-tight">LONGBOW</div>
                <div className="label mt-1">FINANCE</div>
              </div>
            </div>
            <p className="mt-4 max-w-xs text-sm text-[var(--color-muted)]">
              Leveraged longs on $LONG. Deposit ETH, pick a multiplier, earn as it climbs. No
              shorts. No borrowing.
            </p>
            <div className="mt-5 flex gap-2">
              <Social label="X / Twitter" href="https://x.com/longbowfi">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
              </Social>
              <Social label="GitHub" href="https://github.com/Longbow-Finance">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z"
                />
              </Social>
            </div>
          </div>

          {/* Protocol links */}
          <FooterCol title="PROTOCOL">
            <FooterLink href="/dashboard">Dashboard</FooterLink>
            <FooterLink href="/#how">How it works</FooterLink>
            <FooterLink href="/#start">Get started</FooterLink>
          </FooterCol>

          {/* Resources */}
          <FooterCol title="RESOURCES">
            <FooterLink href="/litepaper">Litepaper</FooterLink>
            <FooterExternal href="https://robinhoodchain.blockscout.com">Explorer</FooterExternal>
            <FooterLink href="#">Docs</FooterLink>
          </FooterCol>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-[var(--color-border)] pt-6">
          <span className="label">© 2026 LONGBOW FINANCE</span>
        </div>
      </div>
    </footer>
  );
}

function Social({
  label,
  href,
  children,
}: {
  label: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className="flex h-9 w-9 items-center justify-center border border-[var(--color-border-bright)] text-[var(--color-muted)] transition hover:border-[var(--color-long)] hover:text-[var(--color-long)]"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        {children}
      </svg>
    </a>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label mb-4">{title}</div>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm text-[var(--color-muted)] transition hover:text-[var(--color-long)]">
        {children}
      </Link>
    </li>
  );
}

function FooterExternal({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-sm text-[var(--color-muted)] transition hover:text-[var(--color-long)]"
      >
        {children}
      </a>
    </li>
  );
}
