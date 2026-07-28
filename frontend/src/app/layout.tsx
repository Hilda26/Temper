import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { WalletProvider } from "@/lib/wallet/WalletProvider";
import ConnectButton from "@/components/ConnectButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TEMPER",
  description: "Operational promises with capital behind them.",
};

const NAV_ITEMS = [
  { href: "/field", label: "FIELD" },
  { href: "/commitments", label: "COMMITMENTS" },
  { href: "/incidents", label: "INCIDENTS" },
  { href: "/coverage", label: "COVERAGE" },
  { href: "/capital", label: "CAPITAL" },
  { href: "/archive", label: "ARCHIVE" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <WalletProvider>
          <header className="border-b border-[var(--color-border-default)] bg-[var(--color-surface)]">
            <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4">
              {/* Wordmark */}
              <Link
                href="/"
                className="font-mono text-sm font-semibold tracking-[0.25em] text-stone-900 dark:text-stone-100"
              >
                TEMPER
              </Link>

              {/* Navigation */}
              <nav className="hidden items-center gap-6 md:flex">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-stone-500 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              {/* Wallet connect */}
              <div className="flex items-center gap-2">
                <ConnectButton />
              </div>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-[var(--color-border-default)] bg-[var(--color-surface)]">
            <div className="mx-auto flex h-10 max-w-7xl items-center justify-between px-4">
              <span className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                TEMPER v0.1 / StudioNet
              </span>
              <span className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Operational Observatory
              </span>
            </div>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
