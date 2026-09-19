import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { NativeShell } from "@/components/native-shell";
import "./globals.css";

const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Sprout", template: "%s · Sprout" },
  description: "Parents set the goal. Children explore interactive lessons built just for them.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f8f5ee",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <NativeShell />
        {children}
      </body>
    </html>
  );
}
