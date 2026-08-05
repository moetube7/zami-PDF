import type { ReportChapter } from "@/core/types";

interface Props {
  chapter: ReportChapter;
}

// 챕터 제목 페이지와 본문 사이의 전용 삽화 페이지 — 삽화가 있을 때만 렌더링된다.
// 제목 페이지와 한 페이지를 공유하지 않고 별도 페이지로 분리해, 삽화가 실제로
// 리포트 분량에 페이지를 더하도록 한다.
export default function ChapterIllustrationPage({ chapter }: Props) {
  const illustration = chapter.illustration;
  if (!illustration) return null;

  const imageSrc =
    illustration.url ?? (illustration.base64 ? `data:${illustration.mimeType};base64,${illustration.base64}` : undefined);
  if (!imageSrc) return null;

  return (
    <section className="chapter-illustration-page">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageSrc} alt={illustration.altText} className="chapter-illustration-full" />
    </section>
  );
}
