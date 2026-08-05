// 12지지 시진 (생시가 확정된 상태) — "모름"은 포함하지 않음
export type ZhiHour = "자" | "축" | "인" | "묘" | "진" | "사" | "오" | "미" | "신" | "유" | "술" | "해";

// 사용자 생년월일시 정보
export interface UserProfile {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: string; // "자"|"축"|"인"|"묘"|"진"|"사"|"오"|"미"|"신"|"유"|"술"|"해"|"모름"
  calendarType: "solar" | "lunar";
  gender: "M" | "F";
  createdAt: string;
}

// 자미두수 12궁 정보
export interface Palace {
  name: string; // 명궁, 형제궁, 부처궁, ...
  stars: string[];      // 주성 (14주성)
  minorStars: string[]; // 소성 (화록/화권/화과/화기/좌보/우필 등)
  position: number;     // 地支 인덱스 0~11 (子=0, 丑=1, ... 亥=11)
}

// 자미두수 명반
export interface ZamiBoard {
  mingGong: string; // 명궁 주성
  palaces: Record<string, Palace>;
  mingGongPosition: number;
  fiveElementGroup: number; // 오행국 (2,3,4,5,6)
}

// 교차 분석 카드
export interface AnalysisCard {
  id: string;
  area: string;
  zamiAdvantage: string;
  interpretation: string;
  isLocked: boolean;
}

// 분석 결과 전체
export interface AnalysisResult {
  mingpan: ZamiBoard;
  crossAnalysis: AnalysisCard[];
  summary?: string;
}

// 오늘의 운세
export interface DailyFortune {
  date: string;
  summary: string;
  details: {
    총운: { text: string; isLocked: boolean };
    재물운: { text: string; isLocked: boolean };
    대인운: { text: string; isLocked: boolean };
    건강운: { text: string; isLocked: boolean };
  };
}

// API 요청 타입
export interface AnalyzeRequest {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: string;
  calendarType: "solar" | "lunar";
  gender: "M" | "F";
  type?: "free" | "locked";
}

export interface DailyRequest {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: string;
  gender: "M" | "F";
  today: string;
}

// 프리미엄 리포트 — 챕터 단위 장문 구조
export type ReportChapterKind =
  | "overview"
  | "wuxing"
  | "palace"
  | "synthesis"
  | "decade"
  | "annual"
  | "lifestage"
  | "advice";

export interface ImageAsset {
  url?: string;
  base64?: string;
  mimeType: string;
  width: number;
  height: number;
  altText: string;
}

export interface ReportChapter {
  id: string;
  title: string;
  kind: ReportChapterKind;
  bodyMarkdown: string;
  illustration?: ImageAsset;
}

export interface ReportDocument {
  meta: {
    customerLabel?: string;
    generatedAt: string;
    boardSummary: string;
  };
  board: ZamiBoard;
  chapters: ReportChapter[];
}

// 고민 상담 카테고리
export type ConsultCategory = "연애" | "금전" | "직장";

// 카테고리별 고민 상담 결과
export interface ConsultReport {
  categoryTitle: string;
  overallConclusion?: string;
  mingpanInsight: string;
  concernAnalysis: string;
  advice: string;
  timing: string;
}
