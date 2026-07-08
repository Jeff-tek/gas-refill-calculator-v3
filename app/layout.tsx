// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gas Refill Calculator",
  description:
    "Digital-scale terminal for LPG refills. Price or kg fill modes, strict 2-decimal precision, daily sales summary, and shareable receipts.",
};

export const viewport: Viewport = {
  themeColor: "#25282e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jetbrains.variable}>
      <body>{children}</body>
    </html>
  );
}
