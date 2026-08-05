import { randomUUID } from "crypto";
import type { ReportDocument } from "@/core/types";

// PDF 생성 파이프라인 전용 임시 저장소 — DB 없이 로컬 프로세스 메모리에만 존재.
// generatePdf가 Puppeteer로 /print/[reportId]를 navigate하는 짧은 시간 동안만 필요하므로,
// TTL이 지나면 자동으로 사라진다.

interface StoreEntry {
  doc: ReportDocument;
  createdAt: number;
}

const TTL_MS = 5 * 60 * 1000; // 5분

// Next.js(Turbopack) 개발 서버는 라우트 핸들러와 페이지 라우트를 서로 다른 모듈 인스턴스로
// 컴파일할 수 있어, 일반 모듈 스코프 변수로는 API 라우트에서 넣은 값을 페이지 라우트가 못 읽는
// 문제가 발생한다. 프로세스 전역(globalThis)에 붙여 인스턴스를 하나로 강제한다.
const globalForStore = globalThis as unknown as { __zamiReportStore?: Map<string, StoreEntry> };
const store = globalForStore.__zamiReportStore ?? new Map<string, StoreEntry>();
globalForStore.__zamiReportStore = store;

export function putReport(doc: ReportDocument): string {
  const id = randomUUID();
  store.set(id, { doc, createdAt: Date.now() });
  return id;
}

export function getReport(id: string): ReportDocument | undefined {
  const entry = store.get(id);
  if (!entry) return undefined;
  if (Date.now() - entry.createdAt > TTL_MS) {
    store.delete(id);
    return undefined;
  }
  return entry.doc;
}

export function deleteReport(id: string): void {
  store.delete(id);
}
