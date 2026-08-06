// 명궁 원형(archetype) 성격 설명 — 사용자 검수 필요한 초안
//
// identifyPalaceArchetype(board)가 반환하는 r값(0~11)은 명궁이 자미로부터 떨어진 상대 거리이며,
// placeMajorStars(Z)의 구조상 Z와 무관하게 항상 아래 12가지 고정된 주성 조합 중 하나로 귀결된다
// (전통 자미두수의 "자미재자/축/인/.../해" 12기본격국과 일치).
//
// 이 설명들은 생시 확정 질문(disambiguation)의 선택지 문구로 직접 사용되므로,
// 1인칭/2인칭이 섞이지 않는 자기서술 톤, 2~3문장, 서로 겹치지 않는 뚜렷한 특징으로 작성했다.
// 자미두수 전문 지식 기반 검수·수정이 필요한 1차 초안이다.

export interface PalaceArchetype {
  label: string;
  stars: string[];
  description: string;
}

export const PALACE_ARCHETYPES: Record<number, PalaceArchetype> = {
  0: {
    label: "자미+파군",
    stars: ["자미", "파군"],
    description: "규칙보다 내 판단을 믿고, 익숙한 걸 갈아엎고 새로 시작하는 게 편하다.",
  },
  1: {
    label: "공궁 (대궁 천동+천량)",
    stars: [],
    description: "특별히 나서지 않고, 편안한 분위기를 따라가는 편이다.",
  },
  2: {
    label: "천부",
    stars: ["천부"],
    description: "크게 벌이기보다 차근차근 안정적으로 쌓아가는 편이다.",
  },
  3: {
    label: "태음",
    stars: ["태음"],
    description: "겉으로 잘 안 드러내고, 속으로 섬세하게 헤아리는 편이다.",
  },
  4: {
    label: "염정+탐랑",
    stars: ["염정", "탐랑"],
    description: "사람들과 잘 어울리고, 매력으로 분위기를 이끄는 편이다.",
  },
  5: {
    label: "거문",
    stars: ["거문"],
    description: "일단 의심하고, 직접 파고들어 확인해야 직성이 풀린다.",
  },
  6: {
    label: "천상",
    stars: ["천상"],
    description: "한쪽에 치우치기보다 중간에서 균형을 맞추는 게 편하다.",
  },
  7: {
    label: "천동+천량",
    stars: ["천동", "천량"],
    description: "갈등보다 평화를 택하고, 원칙 지키며 남을 챙기는 편이다.",
  },
  8: {
    label: "무곡+칠살",
    stars: ["무곡", "칠살"],
    description: "말보다 행동이 앞서고, 정하면 거침없이 밀어붙인다.",
  },
  9: {
    label: "태양",
    stars: ["태양"],
    description: "내 것을 아낌없이 나누고, 앞에 나서서 밝혀주는 게 편하다.",
  },
  10: {
    label: "공궁 (대궁 염정+탐랑)",
    stars: [],
    description: "하나로 고정되기보다, 사람과 상황 따라 다양한 모습을 보인다.",
  },
  11: {
    label: "천기",
    stars: ["천기"],
    description: "머리 회전이 빠르고, 늘 다음 수를 먼저 생각하는 편이다.",
  },
};
