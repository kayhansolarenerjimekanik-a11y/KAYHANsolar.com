import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";

import { ChatFab } from "@/components/ai/chat-fab";
import { CookieBanner } from "@/components/consent/cookie-banner";
import { PageTrack } from "@/components/analytics/page-track";
import { CursorEffect } from "@/components/shared/cursor-effect";
import { ThemeProvider } from "@/components/shared/theme-provider";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://kayhansolar.com"),
  title: {
    default: "KAYHAN Solar & Enerji — Güneşin Gücü, Senin Kontrolünde",
    template: "%s | KAYHAN Solar",
  },
  description:
    "Güneş enerjisi sistemleri, paneller, inverterler, bataryalar ve aydınlatma çözümleri.",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "KAYHAN Solar & Enerji",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "KAYHAN Solar & Enerji",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0f0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-dvh flex flex-col antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CursorEffect />
          <PageTrack />
          {children}
          <ChatFab />
          <CookieBanner />
          <Analytics />
          <Toaster
            position="bottom-right"
            theme="system"
            toastOptions={{ classNames: { toast: "glass !rounded-xl" } }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
