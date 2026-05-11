import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
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
    "Güneş enerjisi sistemleri, paneller, inverterler, bataryalar ve aydınlatma çözümleri. Anahtar teslim kurulum ve ücretsiz teklif.",
  keywords: [
    "güneş enerjisi",
    "solar panel",
    "monokristal panel",
    "inverter",
    "lityum batarya",
    "ges",
    "kayhan solar",
  ],
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "KAYHAN Solar & Enerji",
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
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster
            position="bottom-right"
            theme="system"
            toastOptions={{
              classNames: {
                toast: "glass !rounded-xl",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
