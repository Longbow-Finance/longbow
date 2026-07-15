import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
});

const description =
  "Deposit ETH, pick a multiplier, and earn $LONG rewards as the price rises. Losses feed the pool. No shorts, no borrowing, no tokens up front.";

export const metadata: Metadata = {
  metadataBase: new URL("https://longbowfi.xyz"),
  title: {
    default: "Longbow — The leverage layer for $LONG",
    template: "%s · Longbow",
  },
  description,
  applicationName: "Longbow",
  keywords: [
    "Longbow",
    "LONG",
    "Robinhood Chain",
    "DeFi",
    "leverage",
    "Ethereum",
  ],
  openGraph: {
    type: "website",
    url: "https://longbowfi.xyz",
    siteName: "Longbow",
    title: "Longbow — The leverage layer for $LONG",
    description,
    images: [{ url: "/longbow-og.png", width: 1536, height: 1024, alt: "Longbow — the leverage layer for $LONG" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@longbowfi",
    creator: "@longbowfi",
    title: "Longbow — The leverage layer for $LONG",
    description,
    images: ["/longbow-og.png"],
  },
  icons: {
    icon: "/longbow-icon.png",
    apple: "/longbow-icon.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
