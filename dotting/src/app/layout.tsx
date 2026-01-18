import type { Metadata } from "next";
import { Noto_Serif_KR } from "next/font/google";
import "./globals.css";

// Noto Serif KR - 책의 질감을 위한 Serif 폰트
const notoSerifKR = Noto_Serif_KR({
  variable: "--font-noto-serif-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DOTTING - 부모님의 이야기를 책으로",
  description: "AI가 인터뷰하고, 편집하고, 아름다운 책으로 완성해드려요. 모든 이야기는 계속된다.",
  keywords: ["부모님 선물", "자서전", "인생 이야기", "책 만들기", "AI 인터뷰"],
  openGraph: {
    title: "DOTTING - 부모님의 이야기를 책으로",
    description: "AI가 인터뷰하고, 편집하고, 아름다운 책으로 완성해드려요.",
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard 웹폰트 - 메인 UI 폰트 */}
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className={`${notoSerifKR.variable} antialiased`}>
        <div className="texture-overlay" />
        {children}
      </body>
    </html>
  );
}
