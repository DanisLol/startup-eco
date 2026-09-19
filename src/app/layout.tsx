import type { Metadata } from "next";
import { IBM_Plex_Mono, Lexend, Shantell_Sans } from "next/font/google";
import "./globals.css";

const display = Shantell_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700", "800"],
});

const body = Lexend({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "Pebble",
  description: "A one-lesson hop for kids, started by a parent text.",
};

/**
 * Root layout for the kid-facing lesson app.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        {children}
      </body>
    </html>
  );
}
