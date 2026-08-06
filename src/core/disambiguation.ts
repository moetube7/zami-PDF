// 생시 불확실성 해소(MBTI식 질문으로 명반 확정) — 질문 생성/판별 로직
//
// 모든 함수는 순수/결정적(랜덤 없음)이며, 서버는 매 요청마다 {birthInput, answers[]}를 받아
// 동일한 후보/질문 시퀀스를 재계산한다 (기존 코드베이스의 완전 무상태 컨벤션 유지).
//
// 핵심 원칙: 선택지는 항상 "실제 후보 시진 1개 = 옵션 1개"로 만든다(뭉뚱그려 합치지 않음).
// 구별 근거는 주성(원형) → 소성 → 시진 자체 순으로 시도하고, 옵션 수가 한 화면에 너무 많아질
// 때만 대분류/원형 단계로 먼저 좁힌다. buildDistinguishingOptions()가 이 원칙을 구현한다.

import { ZamiBoard, ZhiHour } from "./types";
import { identifyPalaceArchetype } from "./calculator";
import { PALACE_ARCHETYPES } from "./archetypes";

export interface CandidateBoard {
  hour: ZhiHour;
  board: ZamiBoard;
}

export interface DisambiguationOption {
  id: string;
  text: string;
  targetHours: ZhiHour[];
}

export interface DisambiguationQuestion {
  id: string;
  prompt: string;
  options: DisambiguationOption[];
}

function archetypeOf(candidate: CandidateBoard): number {
  return identifyPalaceArchetype(candidate.board);
}

function groupByArchetype(candidates: CandidateBoard[]): Map<number, CandidateBoard[]> {
  const groups = new Map<number, CandidateBoard[]>();
  for (const c of candidates) {
    const r = archetypeOf(c);
    const list = groups.get(r) ?? [];
    list.push(c);
    groups.set(r, list);
  }
  return groups;
}

// ─────────────────────────────────────────────
// 소성 힌트 — 주성이 겹치는 후보를 구별하는 2차 근거
// ─────────────────────────────────────────────

const MINOR_STAR_HINTS: Record<string, string> = {
  "록존": "한번 자리 잡은 곳에서 안정적으로 관리하고 지키는 힘이 강하다",
  "천마": "이동과 변화가 잦고, 여기저기 움직이는 걸 좋아한다",
  "지겁": "하나에 꽂히면 깊이 파고드는 편이다",
  "지공": "생각이 많고 이상이나 원리를 추구하는 편이다",
  "화권": "주도권을 쥐고 밀어붙이려는 의지가 강하다",
  "화기": "예민하고 신경 쓸 일이 많다고 느끼는 편이다",
  "문창": "논리적으로 정리하고 글·문서를 다루는 데 능하다",
  "문곡": "말주변이 좋고 표현력이 뛰어나다",
  "경양": "추진력은 있지만 마찰이 생기기 쉬운 편이다",
  "타라": "우회적이고 신중하게 움직이는 편이다",
};

// 후보 각각에 "1후보 = 1옵션"을 원칙으로 텍스트를 배정한다.
// 우선순위: (1) 명궁 주성 조합이 후보군 내에서 유일하면 → 원형 설명
//          (2) 주성이 겹치면 → 그 그룹 안에서 아직 안 쓰인 소성 힌트
//          (3) 소성도 겹치거나 없으면 → 시진 자체를 근거로 하는 최소한의 구별 문구
// targetHours가 2개 이상인 옵션은 만들지 않는다 — 항상 후보 수만큼 옵션이 나온다.
function buildDistinguishingOptions(candidates: CandidateBoard[], idPrefix: string): DisambiguationOption[] {
  const groups = groupByArchetype(candidates);
  const options: DisambiguationOption[] = [];
  let idx = 0;

  for (const [r, group] of groups) {
    if (group.length === 1) {
      const archetype = PALACE_ARCHETYPES[r];
      options.push({
        id: `${idPrefix}_opt${idx++}`,
        text: archetype?.description ?? `"${group[0].hour}시" 무렵의 특징에 가깝다`,
        targetHours: [group[0].hour],
      });
      continue;
    }

    const used = new Set<string>();
    const unresolved: CandidateBoard[] = [];
    for (const c of group) {
      const minorStars = c.board.palaces["명궁"]?.minorStars ?? [];
      const hint = minorStars.map((s) => MINOR_STAR_HINTS[s]).find((h): h is string => !!h && !used.has(h));
      if (hint) {
        used.add(hint);
        options.push({ id: `${idPrefix}_opt${idx++}`, text: hint, targetHours: [c.hour] });
      } else {
        unresolved.push(c);
      }
    }
    for (const c of unresolved) {
      options.push({
        id: `${idPrefix}_opt${idx++}`,
        text: `그 중에서도 "${c.hour}시" 무렵의 특징에 조금 더 가깝다`,
        targetHours: [c.hour],
      });
    }
  }

  return options;
}

// ─────────────────────────────────────────────
// 대분류 / 원형별 질문 (옵션 수가 많을 때 먼저 좁히는 용도)
// ─────────────────────────────────────────────

// 12개 명궁 원형을 4개의 상위 성향군으로 묶는 고정 분류 (1차 초안 — 자미두수 전문 지식 기반 검수 필요)
const ARCHETYPE_GROUP: Record<number, "A" | "B" | "C" | "D"> = {
  0: "A", 8: "A", 9: "A",       // 주도형: 자미+파군, 무곡+칠살, 태양
  2: "B", 6: "B", 7: "B",       // 온화형: 천부, 천상, 천동+천량
  1: "C", 3: "C", 10: "C", 11: "C", // 감성형: 공궁(2종), 태음, 천기
  4: "D", 5: "D",                // 사교형: 염정+탐랑, 거문
};

const GROUP_INFO: Record<"A" | "B" | "C" | "D", { label: string; text: string }> = {
  A: { label: "주도형", text: "결정이 필요하면 내가 먼저 나서서 이끈다." },
  B: { label: "온화형", text: "갈등보다 평화를 택하고, 원칙 지키며 주변을 챙긴다." },
  C: { label: "감성형", text: "겉보다 마음으로 헤아리고, 상황 따라 유연하게 움직인다." },
  D: { label: "사교형", text: "새로운 사람·경험에 거리낌 없이 먼저 다가간다." },
};

function buildBroadQuestion(id: string, candidates: CandidateBoard[]): DisambiguationQuestion {
  const presentGroups = new Set(candidates.map((c) => ARCHETYPE_GROUP[archetypeOf(c)]));
  const options: DisambiguationOption[] = Array.from(presentGroups).map((g) => ({
    id: `${id}_${g}`,
    text: GROUP_INFO[g].text,
    targetHours: candidates.filter((c) => ARCHETYPE_GROUP[archetypeOf(c)] === g).map((c) => c.hour),
  }));
  return { id, prompt: "아래 네 가지 모습 중 나와 가장 가까운 것은?", options };
}

function buildArchetypeQuestion(id: string, candidates: CandidateBoard[]): DisambiguationQuestion {
  const groups = groupByArchetype(candidates);
  const options: DisambiguationOption[] = Array.from(groups.entries()).map(([r, group], i) => {
    const archetype = PALACE_ARCHETYPES[r];
    return {
      id: `${id}_opt${i}`,
      text: archetype?.description ?? `"${group.map((g) => g.hour).join("/")}시" 무렵의 특징에 가깝다`,
      targetHours: group.map((g) => g.hour),
    };
  });
  return { id, prompt: "아래 설명 중 평소 본인과 가장 가까운 것을 하나만 골라주세요.", options };
}

// ─────────────────────────────────────────────
// 공통 플래너 — 후보 수에 따라 필요한 만큼만 단계를 밟는다
// ─────────────────────────────────────────────

const MAX_OPTIONS_PER_QUESTION = 4;

function planDisambiguationQuestion(
  candidates: CandidateBoard[],
  askedQuestionIds: string[],
  idPrefix: "case_a" | "case_b"
): DisambiguationQuestion | null {
  if (candidates.length <= 1) return null;

  const distinguishId = `${idPrefix}_distinguish`;
  const broadId = `${idPrefix}_broad`;
  const archId = `${idPrefix}_arch`;

  const alreadyTriedBroad = askedQuestionIds.includes(broadId);
  const alreadyTriedArch = askedQuestionIds.includes(archId);
  // 대분류·원형 단계를 이미 다 거쳤다면 더 쪼갤 방법이 없으므로, 옵션 수가 많아도 최종 구별로 확정한다
  const exhaustedCoarseTiers = alreadyTriedBroad && alreadyTriedArch;

  // 1단계: 지금 바로 다 구별해도 옵션이 기준 이내면(또는 더 쪼갤 방법이 없으면) 그대로 질문
  if (!askedQuestionIds.includes(distinguishId)) {
    const fullOptions = buildDistinguishingOptions(candidates, distinguishId);
    if (fullOptions.length <= MAX_OPTIONS_PER_QUESTION || exhaustedCoarseTiers) {
      return {
        id: distinguishId,
        prompt: "아래 설명 중 평소 본인과 가장 가까운 것을 하나만 골라주세요.",
        options: fullOptions,
      };
    }
  }

  // 2단계: 후보가 여러 대분류에 걸쳐 있으면 대분류 질문으로 먼저 좁힌다
  if (!alreadyTriedBroad) {
    const presentGroups = new Set(candidates.map((c) => ARCHETYPE_GROUP[archetypeOf(c)]));
    if (presentGroups.size > 1) return buildBroadQuestion(broadId, candidates);
  }

  // 3단계: 하나의 대분류로 좁혀졌지만 아직 명궁 원형이 여럿이면 원형별 질문
  if (!alreadyTriedArch) {
    const archGroups = groupByArchetype(candidates);
    if (archGroups.size > 1) return buildArchetypeQuestion(archId, candidates);
  }

  return null;
}

// ─────────────────────────────────────────────
// Case A — 생시가 입력된 경우: 3개 후보(앞/해당/뒤 시진)
// ─────────────────────────────────────────────

// 후보가 항상 최대 3개이므로 1단계(전체 구별)에서 언제나 끝난다 — 질문은 항상 정확히 1개.
export function buildSingleDisambiguationQuestion(candidates: CandidateBoard[]): DisambiguationQuestion | null {
  return planDisambiguationQuestion(candidates, [], "case_a");
}

// ─────────────────────────────────────────────
// Case B — 생시를 모르는 경우: 최대 12개 후보
// ─────────────────────────────────────────────

export function nextDisambiguationQuestion(
  candidates: CandidateBoard[],
  askedQuestionIds: string[] = []
): DisambiguationQuestion | null {
  return planDisambiguationQuestion(candidates, askedQuestionIds, "case_b");
}

// ─────────────────────────────────────────────
// 최종 확정
// ─────────────────────────────────────────────

// 지금까지의 답변을 순서대로 재적용해 남은 후보와 이미 물어본 질문 id를 계산한다.
// (완전 무상태 설계 — 매 요청마다 처음부터 재계산)
export function advanceCandidates(
  mode: "adjacent" | "all12",
  candidates: CandidateBoard[],
  answers: { questionId: string; optionId: string }[]
): { remaining: CandidateBoard[]; askedQuestionIds: string[] } {
  let remaining = candidates;
  const askedQuestionIds: string[] = [];

  for (const answer of answers) {
    const question =
      mode === "adjacent"
        ? buildSingleDisambiguationQuestion(remaining)
        : nextDisambiguationQuestion(remaining, askedQuestionIds);
    if (!question) break;
    askedQuestionIds.push(question.id);

    const option = question.options.find((o) => o.id === answer.optionId);
    if (!option) continue;

    const hourSet = new Set(option.targetHours);
    const filtered = remaining.filter((c) => hourSet.has(c.hour));
    if (filtered.length > 0) remaining = filtered;
  }

  return { remaining, askedQuestionIds };
}

export function resolveBestCandidate(
  mode: "adjacent" | "all12",
  candidates: CandidateBoard[],
  answers: { questionId: string; optionId: string }[],
  anchorHour?: ZhiHour
): CandidateBoard {
  const { remaining } = advanceCandidates(mode, candidates, answers);

  if (remaining.length === 1) return remaining[0];

  // 질문을 다 거치고도 후보가 남으면(설계상 거의 없음) 자기보고 앵커(원래 입력한 시진) 우선, 없으면 첫 번째
  const anchored = anchorHour ? remaining.find((c) => c.hour === anchorHour) : undefined;
  return anchored ?? remaining[0] ?? candidates[0];
}
