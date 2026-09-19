import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "M8 Blog Studio",
  description: "LLMO対策ブログ記事生成システム",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
