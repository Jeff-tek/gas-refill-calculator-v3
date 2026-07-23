// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import "./globals.css";

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gas Refill Terminal",
  description:
    "Digital-scale terminal for LPG refills. Price or kg fill modes, strict 2-decimal precision, daily sales summary, and shareable receipts.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Gas Refill",
    statusBarStyle: "black-translucent",
  },
  icons: [
    { rel: "icon", url: "/icons/favicon.png", sizes: "48x48" },
    { rel: "apple-touch-icon", url: "/icons/apple-touch-icon.png", sizes: "180x180" },
  ],
};

export const viewport: Viewport = {
  themeColor: "#25282e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jetbrains.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        {children}
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
