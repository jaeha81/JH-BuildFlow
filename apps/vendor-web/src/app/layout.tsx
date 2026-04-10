import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "협력사 포털 — JH BuildFlow",
  description: "인테리어 공사 협력사 발주·견적·정산 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
