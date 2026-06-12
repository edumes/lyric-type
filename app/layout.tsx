import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lyric Type",
  description: "A synchronized music typing app powered by LRCLIB and yt-dlp.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
