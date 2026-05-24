import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Unixcorn",
  description: "Local-first offensive security operating environment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <head>
        {/* Inject light mode CSS variable overrides — bypasses Turbopack CSS cache */}
        <style dangerouslySetInnerHTML={{ __html: `
          html.light {
            --color-zinc-950: #fafafa;
            --color-zinc-900: #f4f4f5;
            --color-zinc-800: #e4e4e7;
            --color-zinc-700: #d4d4d8;
            --color-zinc-600: #a1a1aa;
            --color-zinc-500: #52525c;
            --color-zinc-400: #3f3f46;
            --color-zinc-300: #27272a;
            --color-zinc-200: #18181b;
            --color-zinc-100: #09090b;
            --color-zinc-50: #030303;
            color-scheme: light;
          }
        `}} />
        {/* Apply saved theme before first paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme')||'dark';document.documentElement.classList.remove('dark','light');document.documentElement.classList.add(t);})();`,
          }}
        />
      </head>
      <body className="min-h-full bg-zinc-950">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
