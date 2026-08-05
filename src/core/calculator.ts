import { ZamiBoard, Palace, ZhiHour } from "./types";
import { describeStars, describeMinorStars } from "./starMeanings";

// ─────────────────────────────────────────────
// 상수 정의
// ─────────────────────────────────────────────

// 12지지 순서 (인덱스와 동일한 순서, 순환 계산에 사용)
const HOUR_ORDER: ZhiHour[] = [
  "자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해",
];

// 12지지 시간 → 인덱스 (子=0, 丑=1, ... 亥=11)
// "모름"은 의도적으로 포함하지 않음 — calculateZamiBoard는 생시가 확정된 경우에만 호출되어야 함
const HOUR_TO_ZHI: Record<ZhiHour, number> = {
  "자": 0, "축": 1, "인": 2, "묘": 3, "진": 4, "사": 5,
  "오": 6, "미": 7, "신": 8, "유": 9, "술": 10, "해": 11,
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
  birthHour: ZhiHour,
  gender: "M" | "F"
): ZamiBoard {
  void gender;

  const hourZhi = HOUR_TO_ZHI[birthHour];
  if (hourZhi === undefined) {
    throw new Error(
      `calculateZamiBoard: 생시가 확정되지 않았습니다 ("${birthHour}"). ` +
      `"모름"인 경우 /api/disambiguate로 먼저 명반을 확정한 뒤 호출하세요.`
    );
  }
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

// 특정 궁 하나를 깊이 다루는 챕터용 요약 — 본궁 + 대궁 + 삼합궁 2개(삼방사정)를 모두 제공하고,
// 성계 이름에는 표준 의미를 함께 달아준다. 전통 자미두수는 한 궁을 그 궁 하나만으로 읽지 않고
// 대궁(맞은편)·삼합궁(사방 4칸 떨어진 두 궁)과 함께 "삼방사정"으로 읽는 것이 기본이므로,
// 이 네 궁의 실제 성계 데이터를 모두 프롬프트에 근거로 제공해 심층 해석이 가능하게 한다.
export function summarizeBoardForSinglePalace(board: ZamiBoard, palaceName: string): string {
  const ZHI_NAMES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

  const palace = board.palaces[palaceName];
  if (!palace) {
    throw new Error(`summarizeBoardForSinglePalace: 알 수 없는 궁 이름입니다 ("${palaceName}")`);
  }

  const findByPosition = (pos: number) => Object.values(board.palaces).find((p) => p.position === pos);

  const describe = (p: Palace) => {
    const major = p.stars.length > 0 ? describeStars(p.stars) : "공궁";
    const minor = p.minorStars.length > 0 ? ` [소성: ${describeMinorStars(p.minorStars)}]` : "";
    return `${p.name} — ${major}${minor} (${ZHI_NAMES[p.position]})`;
  };

  const oppositePalace = findByPosition((palace.position + 6) % 12);
  const triangleA = findByPosition((palace.position + 4) % 12);
  const triangleB = findByPosition((palace.position + 8) % 12);

  const lines = [
    `[본궁] ${describe(palace)}`,
    oppositePalace ? `[대궁 — 맞은편, 안팎의 대비 관계] ${describe(oppositePalace)}` : null,
    triangleA ? `[삼합궁 1 — 함께 작용하는 궁] ${describe(triangleA)}` : null,
    triangleB ? `[삼합궁 2 — 함께 작용하는 궁] ${describe(triangleB)}` : null,
    `명궁: ${board.mingGong}`,
    `오행국: ${board.fiveElementGroup}국`,
  ].filter((line): line is string => line !== null);

  return lines.join("\n");
}

// ─────────────────────────────────────────────
// 8. 생시 확정(disambiguation)을 위한 헬퍼
// ─────────────────────────────────────────────

// 시진을 앞(-1)/뒤(+1)로 순환 이동
export function getAdjacentHour(hour: ZhiHour, offset: 1 | -1): ZhiHour {
  const idx = HOUR_ORDER.indexOf(hour);
  if (idx === -1) throw new Error(`getAdjacentHour: 유효하지 않은 시진입니다 ("${hour}")`);
  return HOUR_ORDER[(idx + offset + 12) % 12];
}

// 여러 시진 후보에 대해 한 번에 명반을 계산
export function computeCandidateBoards(
  lunarYear: number,
  lunarMonth: number,
  lunarDay: number,
  gender: "M" | "F",
  hours: ZhiHour[]
): { hour: ZhiHour; board: ZamiBoard }[] {
  return hours.map((hour) => ({
    hour,
    board: calculateZamiBoard(lunarYear, lunarMonth, lunarDay, hour, gender),
  }));
}

// 명궁이 자미로부터 떨어진 상대 거리 r = (명궁지지 - Z) mod 12.
// placeMajorStars(Z)는 Z값과 무관하게 항상 동일한 상대 오프셋으로 14주성을 배치하므로,
// r 값은 항상 0~11의 12가지 고정된 명궁 주성 조합(전통 자미두수의 "자미재자/축/.../해" 12격국) 중 하나로 귀결된다.
export function identifyPalaceArchetype(board: ZamiBoard): number {
  const ziweiPalace = Object.values(board.palaces).find((p) => p.stars.includes("자미"));
  if (!ziweiPalace) {
    throw new Error("identifyPalaceArchetype: 명반에서 자미성 위치를 찾을 수 없습니다");
  }
  return ((board.mingGongPosition - ziweiPalace.position) % 12 + 12) % 12;
}
