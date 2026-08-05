import type { ImageAsset, ReportChapterKind } from "./types";

// 챕터 삽화 연동 지점 — 실제 이미지 생성기(스타일 확정 후 결정)가 들어오기 전까지
// placeholderIllustrationGenerator를 사용한다. 이 인터페이스만 지키면 실제 생성기로
// 다른 코드 변경 없이 교체할 수 있다.

export interface ChapterIllustrationContext {
  chapterId: string;
  chapterTitle: string;
  chapterKind: ReportChapterKind;
  themeKeywords: string[];
  palaceName?: string;
  dominantStars?: string[];
}

export type ChapterIllustrationGenerator = (ctx: ChapterIllustrationContext) => Promise<ImageAsset>;

const KIND_COLORS: Record<ReportChapterKind, [string, string]> = {
  overview: ["#6366f1", "#4338ca"],
  wuxing: ["#10b981", "#047857"],
  palace: ["#8b5cf6", "#6d28d9"],
  synthesis: ["#f59e0b", "#b45309"],
  decade: ["#f43f5e", "#be123c"],
  annual: ["#0ea5e9", "#0369a1"],
  lifestage: ["#a855f7", "#7e22ce"],
  advice: ["#64748b", "#334155"],
};

const KIND_GLYPH: Record<ReportChapterKind, string> = {
  overview: "命",
  wuxing: "行",
  palace: "宮",
  synthesis: "合",
  decade: "運",
  annual: "年",
  lifestage: "生",
  advice: "道",
};

const PALACE_GLYPH: Record<string, string> = {
  명궁: "命", 형제궁: "兄", 부처궁: "妻", 자녀궁: "子",
  재백궁: "財", 질액궁: "疾", 천이궁: "遷", 교우궁: "友",
  관록궁: "祿", 전택궁: "宅", 복덕궁: "福", 부모궁: "父",
};

function buildPlaceholderSvg(ctx: ChapterIllustrationContext): string {
  const [from, to] = KIND_COLORS[ctx.chapterKind] ?? KIND_COLORS.advice;
  const glyph = (ctx.palaceName && PALACE_GLYPH[ctx.palaceName]) || KIND_GLYPH[ctx.chapterKind] || "紫";
  const gradientId = `grad-${ctx.chapterId}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600">
  <defs>
    <linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}" />
      <stop offset="100%" stop-color="${to}" />
    </linearGradient>
  </defs>
  <rect width="1200" height="1600" fill="url(#${gradientId})" />
  <circle cx="600" cy="750" r="320" fill="rgba(255,255,255,0.08)" />
  <circle cx="600" cy="750" r="230" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="3" />
  <text x="600" y="800" font-family="'Noto Serif KR', serif" font-size="220" fill="#ffffff" text-anchor="middle" opacity="0.95">${glyph}</text>
  <text x="600" y="1120" font-family="'Noto Sans KR', sans-serif" font-size="34" font-weight="700" fill="#ffffff" text-anchor="middle" opacity="0.9">${ctx.chapterTitle}</text>
</svg>`;
}

export const placeholderIllustrationGenerator: ChapterIllustrationGenerator = async (ctx) => {
  const svg = buildPlaceholderSvg(ctx);
  return {
    base64: Buffer.from(svg, "utf-8").toString("base64"),
    mimeType: "image/svg+xml",
    width: 1200,
    height: 1600,
    altText: ctx.chapterTitle,
  };
};

// ─────────────────────────────────────────────
// 실제 삽화 생성기 (Gemini 이미지 생성)
// ─────────────────────────────────────────────

// 사용자가 지정한 스타일 지침을 이미지 생성 프롬프트로 그대로 인코딩한다.
const STYLE_GUIDE = `ink-line illustration, bold woodcut-style outlines with strong thick/thin contrast (bold decisive outer contours, thin inner detail lines — a knife-cut graphic impact rather than a soft brush feel), ivory hanji paper background (#F4EFE4), near-black ink lines (#1A1A1A), by default a single accent color cinnabar red (#C8533A) used on 5-10% of the image only at the focal point, for contrast/conflict scenes only (opposing sides, for/against, rise vs decline), a duotone pairing of red (#C8533A) on one side and deep teal (#2F5D50) on the opposing side is allowed, each still limited to ~10% of the image and never overlapping, halftone dot texture for shading (absolutely no gradients); shading inside an accent-colored area may use halftone dots of that same accent color fading out, instead of black, for a riso-print look, when the image includes numbers, figures, arrows, or graphs representing an increase or upward trend, color them red (#C8533A); when representing a decrease or downward trend, color them blue (#2E5C8A), flat solid black blocks for hair and clothing, skin and face areas left as line-only (no fill), modern casual or formal clothing fitted to the scene's context (never hanbok or traditional Korean garments), modern contemporary setting and props (present-day clothing, objects, architecture — no traditional/historical Korean style elements), minimalist facial features: dot or thin-curve eyes, short curve mouth (emotion conveyed through pose not expression), 5-6 head proportion figures with natural unstylized body ratio, asymmetric composition with intentional large negative space (Korean ink-painting negative-space aesthetics), plain minimal background and props with absolutely no ornamental patterns, symbols, or decorative shapes of any kind — East Asian style is expressed only through the figures' facial structure/features, maximum 2-4 colors per image, editorial cartoon style, flat design, no photorealism, no 3D rendering.`;

// 궁별 장면 묘사 — 인물 중심, 현대적 배경, 장식적 상징 없이 포즈와 소품으로만 주제를 표현
const PALACE_SCENES: Record<string, string> = {
  명궁: "a single figure standing centered in three-quarter view, looking toward their own faint shadow cast beside them, symbolizing self-identity",
  형제궁: "two or three figures standing casually side by side mid-conversation, relaxed open body language of friendship",
  부처궁: "two figures facing each other closely, one leaning slightly in — a quiet moment of connection between partners",
  자녀궁: "a figure seated at a table, hands actively shaping or building a small new object",
  재백궁: "a figure holding a small stack of coins in one open palm, a simple upward arrow drawn in the air beside them",
  질액궁: "a figure seated with eyes closed, one hand resting on their own chest, a calm restorative pose",
  천이궁: "a figure mid-stride walking forward carrying a small travel bag, a few motion lines behind them",
  교우궁: "a small loose cluster of figures, one figure standing slightly apart from the rest, looking toward the group",
  관록궁: "a figure standing at a desk with a laptop, one arm raised as if presenting to someone unseen",
  전택궁: "a figure standing in front of a plain modern house facade, one hand resting on the doorframe",
  복덕궁: "a figure sitting alone on the ground with knees drawn up, face turned upward toward open empty space",
  부모궁: "two figures of visibly different generations standing together, the older figure's hand on the younger one's shoulder",
};

const KIND_SCENES: Record<ReportChapterKind, string> = {
  overview: "a single figure standing centered in three-quarter view, chin slightly raised, one hand open at their side",
  wuxing: "a figure captured mid-stride along a gently spiraling path, suggesting cyclical momentum",
  palace: PALACE_SCENES.명궁,
  synthesis: "two figures whose walking paths cross and overlap at a single point, each heading a different direction",
  decade: "a figure climbing a plain staircase that fades into empty negative space at the top",
  annual: "a figure standing beside a single large floating numeral, one hand pointing toward it",
  lifestage: "four figures of the same person at increasing size, standing in a row left to right, ages advancing",
  advice: "a figure standing at the edge of a large empty space, facing outward toward the horizon",
};

function buildIllustrationPrompt(ctx: ChapterIllustrationContext): string {
  const scene =
    ctx.chapterKind === "palace" && ctx.palaceName
      ? PALACE_SCENES[ctx.palaceName] ?? KIND_SCENES.palace
      : KIND_SCENES[ctx.chapterKind];

  return `${STYLE_GUIDE}

Scene: ${scene}.
Do not include any text, lettering, numbers, or written symbols anywhere in the image.
Portrait orientation.`;
}

interface GeminiInteractionResponse {
  steps?: { type?: string; content?: { type?: string; data?: string; mime_type?: string }[] }[];
}

async function callGeminiImageApi(prompt: string): Promise<ImageAsset> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다");

  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemini-3.1-flash-image",
      input: [{ type: "text", text: prompt }],
      response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: "3:4" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini 이미지 생성 실패 (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data: GeminiInteractionResponse = await res.json();
  const imageContent = data.steps
    ?.flatMap((s) => s.content ?? [])
    .find((c) => c.type === "image" && c.data);

  if (!imageContent?.data) {
    throw new Error("Gemini 응답에서 이미지 데이터를 찾을 수 없습니다");
  }

  return {
    base64: imageContent.data,
    mimeType: imageContent.mime_type ?? "image/jpeg",
    width: 1024,
    height: 1365,
    altText: "",
  };
}

export const geminiIllustrationGenerator: ChapterIllustrationGenerator = async (ctx) => {
  const prompt = buildIllustrationPrompt(ctx);
  const asset = await callGeminiImageApi(prompt);
  return { ...asset, altText: ctx.chapterTitle };
};

// Gemini 생성이 실패해도(네트워크 오류, 정책 거부 등) 챕터 텍스트 전달이 막히지 않도록
// 플레이스홀더로 자동 대체하는 안전 래퍼.
export const illustrationGeneratorWithFallback: ChapterIllustrationGenerator = async (ctx) => {
  try {
    return await geminiIllustrationGenerator(ctx);
  } catch (err) {
    console.error(`[illustration] "${ctx.chapterId}" Gemini 생성 실패, 플레이스홀더로 대체:`, err);
    return placeholderIllustrationGenerator(ctx);
  }
};
