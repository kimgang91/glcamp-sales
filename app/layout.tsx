import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "글카펜 영업 현황 대시보드",
  description: "프렌들리 글카펜 타입 영업 현황을 실시간으로 확인할 수 있는 임직원용 대시보드",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="font-sans">{children}</body>
    </html>
  );
}
