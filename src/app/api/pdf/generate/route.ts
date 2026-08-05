import { NextRequest } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { ReportDocument } from "@/core/types";
import { putReport, deleteReport } from "@/pdf/reportStore";
import { generatePdf } from "@/pdf/generatePdf";

export const maxDuration = 120;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Expose-Headers": "X-Saved-Path, X-Saved-Filename",
};

function sanitizeFilename(input: string): string {
  return input.replace(/[^\w가-힣一-龥-]+/g, "_").slice(0, 60) || "report";
}

// 로컬 실행 전제 — 생성된 PDF는 프로젝트 루트의 output/ 폴더에 파일로 저장한다 (DB 불필요).
async function saveToOutputFolder(doc: ReportDocument, pdfBuffer: Buffer): Promise<{ filename: string; savedPath: string }> {
  const outputDir = path.join(process.cwd(), "output");
  await mkdir(outputDir, { recursive: true });

  const label = sanitizeFilename(doc.meta.customerLabel ?? "report");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${label}_${timestamp}.pdf`;
  const savedPath = path.join(outputDir, filename);

  await writeFile(savedPath, pdfBuffer);
  return { filename, savedPath };
}

export async function POST(req: NextRequest) {
  // Puppeteer 렌더링은 로컬 운영자 PC 전제로 설계되어 있고(서버리스 크로미움 미대응),
  // 공개 배포되는 Vercel 환경(고객용 /intake 전용)에서는 절대 실행되지 않도록 차단한다.
  if (process.env.VERCEL) {
    return new Response(JSON.stringify({ error: "이 기능은 로컬 환경에서만 사용할 수 있습니다." }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  let reportId: string | null = null;
  try {
    const doc: ReportDocument = await req.json();
    if (!doc?.chapters || !Array.isArray(doc.chapters) || doc.chapters.length === 0) {
      return new Response(JSON.stringify({ error: "chapters가 비어있는 ReportDocument입니다" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    reportId = putReport(doc);
    const reportUrl = new URL(`/print/${reportId}`, req.nextUrl.origin).toString();

    const pdfBuffer = await generatePdf(reportUrl);
    const { filename, savedPath } = await saveToOutputFolder(doc, pdfBuffer);

    // HTTP 헤더 값은 ByteString(0~255)만 허용되므로, 한글이 포함된 파일명/경로는
    // 그대로 넣을 수 없다. Content-Disposition은 RFC 5987 형식으로, 커스텀 헤더는
    // encodeURIComponent로 인코딩해 전달한다.
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "X-Saved-Path": encodeURIComponent(savedPath),
        "X-Saved-Filename": encodeURIComponent(filename),
        ...corsHeaders,
      },
    });
  } catch (err) {
    console.error("[/api/pdf/generate] 오류:", err);
    return new Response(JSON.stringify({ error: "PDF 생성 중 오류가 발생했습니다" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } finally {
    if (reportId) deleteReport(reportId);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}
