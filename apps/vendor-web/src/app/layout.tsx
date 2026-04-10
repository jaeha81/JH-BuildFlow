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
      {/* 네오브루탈리즘 전역 배경: 따뜻한 오프화이트 */}
      <body className="bg-[#F5F0E8] text-black min-h-screen">{children}</body>
    </html>
  );
}
