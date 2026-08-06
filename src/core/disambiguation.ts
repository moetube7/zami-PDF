// 생시 불확실성 해소(MBTI식 질문으로 명반 확정) — 질문 생성/판별 로직
//
// 모든 함수는 순수/결정적(랜덤 없음)이며, 서버는 매 요청마다 {birthInput, answers[]}를 받아
// 동일한 후보/질문 시퀀스를 재계산한다 (기존 코드베이스의 완전 무상태 컨벤션 유지).

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
// 소성 기반 타이브레이크 (주성 원형이 완전히 겹치는 경우의 2차 판별)
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

function minorStarHintText(candidate: CandidateBoard): string | null {
  const minorStars = candidate.board.palaces["명궁"]?.minorStars ?? [];
  const hints = minorStars.map((s) => MINOR_STAR_HINTS[s]).filter((h): h is string => !!h);
  if (hints.length === 0) return null;
  return hints[0];
}

function buildTieBreakQuestion(id: string, tied: CandidateBoard[]): DisambiguationQuestion {
  const options: DisambiguationOption[] = tied.map((c, i) => {
    const hint = minorStarHintText(c);
    const text = hint
      ? `${hint}`
      : `그 중에서도 "${c.hour}시" 무렵의 특징에 조금 더 가깝다`;
    return { id: `${id}_opt${i}`, text, targetHours: [c.hour] };
  });
  return {
    id,
    prompt: "아래 두 가지 모습 중 나와 더 가까운 쪽은?",
    options,
  };
}

// ─────────────────────────────────────────────
// Case A — 생시가 입력된 경우: 3개 후보(앞/해당/뒤 시진), 질문 최대 1개
// ─────────────────────────────────────────────

export function buildSingleDisambiguationQuestion(
  candidates: CandidateBoard[]
): DisambiguationQuestion | null {
  const groups = groupByArchetype(candidates);

  // 3개 후보가 모두 같은 원형으로 귀결되면 질문으로 구분할 수 없음 — 질문 없이 자동 확정
  if (groups.size <= 1) return null;

  const options: DisambiguationOption[] = Array.from(groups.entries()).map(([r, group], i) => {
    const archetype = PALACE_ARCHETYPES[r];
    return {
      id: `case_a_opt${i}`,
      text: archetype?.description ?? `"${group.map((g) => g.hour).join("/")}시" 무렵의 특징`,
      targetHours: group.map((g) => g.hour),
    };
  });

  return {
    id: "case_a_q1",
    prompt: "아래 설명 중 평소 본인과 가장 가까운 것을 하나만 골라주세요.",
    options,
  };
}

// ─────────────────────────────────────────────
// Case B — 생시를 모르는 경우: 최대 12개 후보, 질문 2~3개로 확정
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

const MAX_FINE_OPTIONS = 4;

export function nextDisambiguationQuestion(
  candidates: CandidateBoard[],
  askedQuestionIds: string[] = []
): DisambiguationQuestion | null {
  if (candidates.length <= 1) return null;

  const groups = groupByArchetype(candidates);

  // 남은 후보가 전부 같은 원형(주성 조합)으로 귀결됨 → 주성만으로는 구분 불가, 소성 타이브레이크로 전환
  if (groups.size === 1) {
    if (askedQuestionIds.includes("case_b_tiebreak")) return null; // 이미 물어봤다면 더 이상 구분 불가
    return buildTieBreakQuestion("case_b_tiebreak", candidates);
  }

  // 남은 후보의 원형 종류가 많으면(강제선택 4개 초과) 대분류 질문으로 먼저 좁힌다
  if (groups.size > MAX_FINE_OPTIONS && !askedQuestionIds.includes("case_b_broad")) {
    const presentGroups = new Set(Array.from(groups.keys()).map((r) => ARCHETYPE_GROUP[r]));
    const options: DisambiguationOption[] = Array.from(presentGroups).map((g) => {
      const hours = candidates
        .filter((c) => ARCHETYPE_GROUP[archetypeOf(c)] === g)
        .map((c) => c.hour);
      return { id: `case_b_broad_${g}`, text: GROUP_INFO[g].text, targetHours: hours };
    });
    return {
      id: "case_b_broad",
      prompt: "아래 네 가지 모습 중 나와 가장 가까운 것은?",
      options,
    };
  }

  // 원형 종류가 4개 이하로 좁혀졌으면 원형 설명으로 세분류 질문
  const options: DisambiguationOption[] = Array.from(groups.entries()).map(([r, group], i) => {
    const archetype = PALACE_ARCHETYPES[r];
    return {
      id: `case_b_fine_opt${i}`,
      text: archetype?.description ?? `"${group.map((g) => g.hour).join("/")}시" 무렵의 특징`,
      targetHours: group.map((g) => g.hour),
    };
  });

  return {
    id: "case_b_fine",
    prompt: "아래 설명 중 평소 본인과 가장 가까운 것을 하나만 골라주세요.",
    options,
  };
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

  // 질문을 다 거치고도 후보가 남으면(설계상 드묾) 자기보고 앵커(원래 입력한 시진) 우선, 없으면 첫 번째
  const anchored = anchorHour ? remaining.find((c) => c.hour === anchorHour) : undefined;
  return anchored ?? remaining[0] ?? candidates[0];
}
