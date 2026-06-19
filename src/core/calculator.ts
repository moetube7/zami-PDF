import { ZamiBoard, Palace } from "./types";

// ─────────────────────────────────────────────
// 상수 정의
// ─────────────────────────────────────────────

// 12지지 시간 → 인덱스 (子=0, 丑=1, ... 亥=11)
const HOUR_TO_ZHI: Record<string, number> = {
  "자": 0, "축": 1, "인": 2, "묘": 3, "진": 4, "사": 5,
  "오": 6, "미": 7, "신": 8, "유": 9, "술": 10, "해": 11,
  "모름": 0,
};

// 12궁 이름 (명궁부터 지지 증가 방향 CW)
const PALACE_NAMES = [
  "명궁", "부모궁", "복덕궁", "전택궁", "관록궁", "교우궁",
  "천이궁", "질액궁", "재백궁", "자녀궁", "부처궁", "형제궁",
];

// ─────────────────────────────────────────────
// 1. 命宮 地支 계산
// ─────────────────────────────────────────────
function getMingGongZhi(lunarMonth: number, hourZhi: number): number {
  return (lunarMonth + 1 - hourZhi + 36) % 12;
}

// ─────────────────────────────────────────────
// 2. 연도 天干 계산 (甲=0...癸=9)
// ─────────────────────────────────────────────
function getYearTianGan(year: number): number {
  return ((year - 4) % 10 + 10) % 10;
}

// ─────────────────────────────────────────────
// 3. 연도 地支 계산 (子=0...亥=11)
// ─────────────────────────────────────────────
function getYearDiZhi(year: number): number {
  return ((year - 4) % 12 + 12) % 12;
}

// ─────────────────────────────────────────────
// 4. 五行局 결정
// ─────────────────────────────────────────────
const TIANCAN_START_IDX = [0, 4, 1, 2, 3];
const WUXING_VALUES = [2, 3, 4, 5, 6];

function getFiveElementGroup(yearTianGan: number, mingGongZhi: number): number {
  const startIdx = TIANCAN_START_IDX[yearTianGan % 5];
  return WUXING_VALUES[(startIdx + mingGongZhi) % 5];
}

// ─────────────────────────────────────────────
// 5. 紫微星 위치 계산 (전통 安紫微訣)
// ─────────────────────────────────────────────
function getZiweiZhi(lunarDay: number, N: number): number {
  const q = Math.floor(lunarDay / N);
  const r = lunarDay % N;
  if (r === 0) return q % 12;
  if (r % 2 === 1) return (q + 1) % 12;
  return (q + 2) % 12;
}

// ─────────────────────────────────────────────
// 6. 14주성 배치
// ─────────────────────────────────────────────
function placeMajorStars(Z: number): Record<number, string[]> {
  const slots: Record<number, string[]> = {};
  const push = (zhi: number, name: string) => {
    if (!slots[zhi]) slots[zhi] = [];
    slots[zhi].push(name);
  };

  const TF = (Z + 2) % 12;

  // 紫微系
  push(Z,                   "자미");
  push((Z - 1 + 12) % 12,  "천기");
  push((Z - 3 + 12) % 12,  "태양");
  push((Z - 4 + 12) % 12,  "무곡");
  push((Z - 5 + 12) % 12,  "천동");
  push((Z - 8 + 12) % 12,  "염정");

  // 天府系
  push(TF,                  "천부");
  push((TF + 1)  % 12,      "태음");
  push((TF + 2)  % 12,      "탐랑");
  push((TF + 3)  % 12,      "거문");
  push((TF + 4)  % 12,      "천상");
  push((TF + 5)  % 12,      "천량");
  push((TF + 6)  % 12,      "칠살");
  push((TF + 10) % 12,      "파군");

  return slots;
}

// ─────────────────────────────────────────────
// 7. 소성(보조성) 배치
// ─────────────────────────────────────────────

const FOUR_TRANSFORMATIONS: Record<number, [string, string, string, string]> = {
  0: ["염정", "파군", "무곡", "태양"],
  1: ["천기", "천량", "자미", "태음"],
  2: ["천동", "천기", "문창", "염정"],
  3: ["태음", "천동", "천기", "거문"],
  4: ["탐랑", "태음", "우필", "천기"],
  5: ["무곡", "탐랑", "좌보", "문곡"],
  6: ["태양", "무곡", "태음", "천동"],
  7: ["거문", "태양", "문곡", "문창"],
  8: ["천량", "자미", "좌보", "무곡"],
  9: ["파군", "거문", "태음", "탐랑"],
};
const SIHUA_LABELS = ["화록", "화권", "화과", "화기"];

const LUXUN_BY_TIANGAN = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];
const TIANMA_TABLE = [2, 11, 8, 5, 2, 11, 8, 5, 2, 11, 8, 5];
const TIANKUI_TABLE = [1, 0, 11, 11, 1, 0, 1, 2, 3, 3];
const TIANYUE_TABLE = [7, 8, 9, 9, 7, 8, 7, 6, 5, 5];
const HUOXING_START = [2, 10, 1, 9, 2, 10, 1, 9, 2, 10, 1, 9];
const LINGSING_START = [10, 10, 3, 10, 10, 3, 10, 10, 3, 10, 10, 3];

function placeMinorStars(
  yearTianGan: number,
  yearDiZhi: number,
  lunarMonth: number,
  hourZhi: number,
  majorSlots: Record<number, string[]>,
  minorSlotsForSihua: Record<number, string[]>
): Record<number, string[]> {
  const slots: Record<number, string[]> = {};
  const push = (zhi: number, name: string) => {
    if (!slots[zhi]) slots[zhi] = [];
    slots[zhi].push(name);
  };

  push(TIANKUI_TABLE[yearTianGan], "천괴");
  push(TIANYUE_TABLE[yearTianGan], "천월");

  const [hLu, hQuan, hKe, hJi] = FOUR_TRANSFORMATIONS[yearTianGan];
  const sihuaTargets = [hLu, hQuan, hKe, hJi];
  for (let i = 0; i < 4; i++) {
    const targetStar = sihuaTargets[i];
    const label = SIHUA_LABELS[i];
    let found = false;
    for (const [zhiStr, stars] of Object.entries(majorSlots)) {
      if (stars.includes(targetStar)) {
        push(Number(zhiStr), label);
        found = true;
        break;
      }
    }
    if (!found) {
      for (const [zhiStr, stars] of Object.entries(minorSlotsForSihua)) {
        if (stars.includes(targetStar)) {
          push(Number(zhiStr), label);
          break;
        }
      }
    }
  }

  const luxunZhi = LUXUN_BY_TIANGAN[yearTianGan];
  push(luxunZhi,                   "록존");
  push((luxunZhi + 1) % 12,        "경양");
  push((luxunZhi - 1 + 12) % 12,   "타라");
  push(TIANMA_TABLE[yearDiZhi],    "천마");

  push((lunarMonth + 3) % 12,      "좌보");
  push((11 - lunarMonth + 12) % 12, "우필");

  push((10 - hourZhi + 12) % 12,   "문창");
  push((4 + hourZhi) % 12,         "문곡");
  push((11 - hourZhi + 12) % 12,   "지공");
  push((11 + hourZhi) % 12,        "지겁");

  push((HUOXING_START[yearDiZhi] + hourZhi) % 12, "화성");
  push((LINGSING_START[yearDiZhi] + hourZhi) % 12, "영성");

  return slots;
}

// ─────────────────────────────────────────────
// 메인: 명반 계산
// ─────────────────────────────────────────────
export function calculateZamiBoard(
  lunarYear: number,
  lunarMonth: number,
  lunarDay: number,
  birthHour: string,
  gender: "M" | "F"
): ZamiBoard {
  void gender;

  const hourZhi     = HOUR_TO_ZHI[birthHour] ?? 0;
  const yearTianGan = getYearTianGan(lunarYear);
  const yearDiZhi   = getYearDiZhi(lunarYear);

  const mingGongZhi = getMingGongZhi(lunarMonth, hourZhi);
  const fiveElementGroup = getFiveElementGroup(yearTianGan, mingGongZhi);
  const ziweiZhi = getZiweiZhi(lunarDay, fiveElementGroup);
  const majorSlots = placeMajorStars(ziweiZhi);

  const tempMinorForSihua: Record<number, string[]> = {};
  const pushTemp = (zhi: number, name: string) => {
    if (!tempMinorForSihua[zhi]) tempMinorForSihua[zhi] = [];
    tempMinorForSihua[zhi].push(name);
  };
  pushTemp((10 - hourZhi + 12) % 12, "문창");
  pushTemp((4 + hourZhi) % 12,       "문곡");

  const minorSlots = placeMinorStars(
    yearTianGan, yearDiZhi, lunarMonth, hourZhi, majorSlots, tempMinorForSihua
  );

  const palaces: Record<string, Palace> = {};
  for (let i = 0; i < 12; i++) {
    const palaceName = PALACE_NAMES[i];
    const zhi = (mingGongZhi + i) % 12;
    palaces[palaceName] = {
      name: palaceName,
      stars: majorSlots[zhi] ?? [],
      minorStars: minorSlots[zhi] ?? [],
      position: zhi,
    };
  }

  const mingGongStars = palaces["명궁"]?.stars ?? [];
  const mingGong = mingGongStars.length > 0 ? mingGongStars.join(" + ") : "공궁";

  return {
    mingGong,
    palaces,
    mingGongPosition: mingGongZhi,
    fiveElementGroup,
  };
}

// ─────────────────────────────────────────────
// AI 프롬프트용 명반 요약
// ─────────────────────────────────────────────
export function summarizeBoardForAI(board: ZamiBoard): string {
  const ZHI_NAMES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

  const lines = Object.entries(board.palaces).map(([name, palace]) => {
    const major = palace.stars.length > 0 ? palace.stars.join(", ") : "공궁";
    const minor = palace.minorStars.length > 0 ? ` [${palace.minorStars.join(", ")}]` : "";
    const zhiName = ZHI_NAMES[palace.position] ?? "";
    return `${name}(${zhiName}): ${major}${minor}`;
  });

  return `명궁: ${board.mingGong}\n오행국: ${board.fiveElementGroup}국\n\n${lines.join("\n")}`;
}

const ANALYSIS_RELEVANT_PALACES: Record<string, string[]> = {
  card_1: ["명궁", "재백궁", "관록궁"],
  card_2: ["명궁", "관록궁", "천이궁"],
  card_3: ["명궁", "교우궁", "형제궁"],
  card_4: ["명궁", "부처궁", "복덕궁"],
};

export function summarizeBoardForAnalysis(board: ZamiBoard, cardIds: string[]): string {
  const ZHI_NAMES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

  const relevantSet = new Set(cardIds.flatMap(id => ANALYSIS_RELEVANT_PALACES[id] ?? []));

  const lines = Object.entries(board.palaces)
    .filter(([name]) => relevantSet.has(name))
    .map(([name, palace]) => {
      const major = palace.stars.length > 0 ? palace.stars.join(", ") : "공궁";
      const minor = palace.minorStars.length > 0 ? ` [${palace.minorStars.join(", ")}]` : "";
      const zhiName = ZHI_NAMES[palace.position] ?? "";
      return `${name}(${zhiName}): ${major}${minor}`;
    });

  return `명궁: ${board.mingGong}\n오행국: ${board.fiveElementGroup}국\n\n${lines.join("\n")}`;
}
