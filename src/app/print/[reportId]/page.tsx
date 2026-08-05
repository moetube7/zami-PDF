import { notFound } from "next/navigation";
import { getReport } from "@/pdf/reportStore";
import ReportDocumentTemplate from "@/pdf/templates/ReportDocument";
import "../print.css";

interface Props {
  params: Promise<{ reportId: string }>;
}

// 클라이언트 JS가 없는 순수 서버 렌더 페이지 — Puppeteer가 navigate해 PDF로 변환한다.
// 일반 브라우저로 직접 열어도 인쇄 레이아웃을 그대로 확인할 수 있다 (로컬 디버깅용).
export default async function PrintPage({ params }: Props) {
  const { reportId } = await params;
  const doc = getReport(reportId);
  if (!doc) notFound();

  return <ReportDocumentTemplate doc={doc} />;
}
