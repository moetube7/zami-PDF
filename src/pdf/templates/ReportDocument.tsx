import type { ReportDocument as ReportDocumentType } from "@/core/types";
import CoverPage from "./CoverPage";
import TableOfContents from "./TableOfContents";
import ChapterDivider from "./ChapterDivider";
import ChapterIllustrationPage from "./ChapterIllustrationPage";
import ChapterBody from "./ChapterBody";

interface Props {
  doc: ReportDocumentType;
}

export default function ReportDocumentTemplate({ doc }: Props) {
  return (
    <div className="report-document">
      <CoverPage
        title="자미두수 프리미엄 리포트"
        subtitle={doc.meta.customerLabel}
        generatedAt={doc.meta.generatedAt}
      />
      <TableOfContents chapters={doc.chapters.map((c) => ({ id: c.id, title: c.title }))} />
      {doc.chapters.map((chapter) => (
        <div key={chapter.id} className="chapter">
          <ChapterDivider chapter={chapter} />
          <ChapterBody chapter={chapter} />
          {/* 삽화는 본문을 다 읽은 뒤 내용을 요약해서 보여주는 용도이므로 본문 뒤에 배치 */}
          <ChapterIllustrationPage chapter={chapter} />
        </div>
      ))}
    </div>
  );
}
