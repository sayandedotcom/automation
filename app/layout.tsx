import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "../styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Automation",
  description:
    "Automate your tasks using Next.js, Playwright, and Vercel AI SDK.",
  keywords: ["automation", "playwright", "next.js", "automation"],
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
