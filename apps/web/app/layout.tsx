import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Flight Search Automation - Powered by Playwright",
  description: "Search flights automatically using Next.js, Playwright, and Vercel AI SDK. Find the best flight deals across the web.",
  keywords: ["flights", "automation", "playwright", "next.js", "flight search"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      <body className="antialiased">
        <Toaster />
        {children}
      </body>
    </html>
  );
}
