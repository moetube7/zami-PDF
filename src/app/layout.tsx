import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "자미두수 명반 리포트",
  description: "자미두수 명반 생성 및 상세 분석 리포트",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, background: "#f9fafb", minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  );
}
