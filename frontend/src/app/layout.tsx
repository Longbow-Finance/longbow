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
  metadataBase: new URL("https://longbow-protocol.xyz"),
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
    url: "https://longbow-protocol.xyz",
    siteName: "Longbow",
    title: "Longbow — The leverage layer for $LONG",
    description,
    images: [{ url: "/longbow-icon.png", alt: "Longbow" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Longbow — The leverage layer for $LONG",
    description,
    images: ["/longbow-icon.png"],
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
