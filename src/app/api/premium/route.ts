import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { calculateZamiBoard } from "@/core/calculator";
import { lunarToSolar, solarToLunar } from "@/core/lunar";
import { ReportChapter, ZamiBoard, ZhiHour } from "@/core/types";
import { extractJsonObject } from "@/core/jsonExtract";
import { PALACE_INTROS } from "@/core/palaceIntros";
import { illustrationGeneratorWithFallback } from "@/core/illustration";
import {
  ChapterGenContext,
  PremiumChapterSpec,
  PREMIUM_CHAPTER_SPECS,
  buildOverviewChapterPrompt,
  buildWuxingChapterPrompt,
  buildPalaceChapterPrompt,
  buildPalaceChapterUserMessage,
  buildSynthesisChapterPrompt,
  buildDecadeChapterPrompt,
  buildAnnualChapterPrompt,
  buildLifestageChapterPrompt,
  buildFinalAdviceChapterPrompt,
  buildPremiumUserMessage,
} from "@/core/prompts";

export const maxDuration = 300;

const client = new Anthropic();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function resolvePrompt(
  spec: PremiumChapterSpec,
  board: ZamiBoard,
  gender: "M" | "F",
  ctx: ChapterGenContext
): { systemPrompt: string; userMessage: string } {
  if (spec.id === "overview") {
    return { systemPrompt: buildOverviewChapterPrompt(ctx), userMessage: buildPremiumUserMessage(board, gender) };
  }
  if (spec.id === "wuxing") {
    return { systemPrompt: buildWuxingChapterPrompt(ctx), userMessage: buildPremiumUserMessage(board, gender) };
  }
  if (spec.id.startsWith("palace_")) {
    const palaceName = spec.id.slice("palace_".length);
    return {
      systemPrompt: buildPalaceChapterPrompt(palaceName, ctx),
      userMessage: buildPalaceChapterUserMessage(board, gender, palaceName),
    };
  }
  if (spec.id === "synthesis") {
    return { systemPrompt: buildSynthesisChapterPrompt(ctx), userMessage: buildPremiumUserMessage(board, gender) };
  }
  if (spec.id === "decade") {
    return { systemPrompt: buildDecadeChapterPrompt(ctx), userMessage: buildPremiumUserMessage(board, gender) };
  }
  if (spec.id === "annual") {
    return { systemPrompt: buildAnnualChapterPrompt(ctx), userMessage: buildPremiumUserMessage(board, gender) };
  }
  if (spec.id === "lifestage") {
    return { systemPrompt: buildLifestageChapterPrompt(ctx), userMessage: buildPremiumUserMessage(board, gender) };
  }
  if (spec.id === "finalAdvice") {
    return { systemPrompt: buildFinalAdviceChapterPrompt(ctx), userMessage: buildPremiumUserMessage(board, gender) };
  }
  throw new Error(`resolvePrompt: 알 수 없는 챕터 id입니다 ("${spec.id}")`);
}

async function generateChapter(
  spec: PremiumChapterSpec,
  board: ZamiBoard,
  gender: "M" | "F",
  ctx: ChapterGenContext
): Promise<ReportChapter> {
  const { systemPrompt, userMessage } = resolvePrompt(spec, board, gender, ctx);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: spec.maxTokens,
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userMessage }],
      });
      const aiText = message.content[0].type === "text" ? message.content[0].text : "";
      const parsed = extractJsonObject(aiText);
      const title = typeof parsed.title === "string" ? parsed.title : spec.id;
      const generatedBody = typeof parsed.body === "string" ? parsed.body : "";

      // 궁의 일반적 의미는 사람마다 달라지지 않으므로 LLM 생성 없이 고정 텍스트를 앞에 붙인다
      // (정확성 보장 + 비용 절감 + "이 섹션이 무엇을 다루는지"에 대한 안내 역할)
      const palaceName = spec.id.startsWith("palace_") ? spec.id.slice("palace_".length) : null;
      const intro = palaceName ? PALACE_INTROS[palaceName] : undefined;
      const body = intro ? `${intro}\n\n${generatedBody}` : generatedBody;

      const themeKeywords = Array.from(new Set(
        [...generatedBody.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1])
      )).slice(0, 6);

      const illustration = await illustrationGeneratorWithFallback({
        chapterId: spec.id,
        chapterTitle: title,
        chapterKind: spec.kind,
        themeKeywords,
        palaceName: palaceName ?? undefined,
      });

      return { id: spec.id, title, kind: spec.kind, bodyMarkdown: body, illustration };
    } catch (err) {
      if (attempt === 2) throw err;
    }
  }
  throw new Error("unreachable");
}

interface DigestState {
  digest: string;
  usedPhrases: string[];
}

// 직전 웨이브까지 생성된 챕터들로부터 반복 방지용 요약/표현 목록을 만든다 (LLM 호출 없이, 저비용/저지연)
function extendDigest(prior: DigestState, newChapters: ReportChapter[]): DigestState {
  const newDigestLines = newChapters.map(
    (c) => `- ${c.title}: ${c.bodyMarkdown.slice(0, 60).replace(/\n+/g, " ")}...`
  );
  const newPhrases = newChapters.flatMap((c) =>
    c.bodyMarkdown
      .split(/\n\n+/)
      .map((p) => p.trim().slice(0, 24))
      .filter((p) => p.length > 0)
  );
  return {
    digest: [prior.digest, ...newDigestLines].filter(Boolean).join("\n"),
    usedPhrases: [...prior.usedPhrases, ...newPhrases],
  };
}

async function runWave(
  specs: PremiumChapterSpec[],
  board: ZamiBoard,
  gender: "M" | "F",
  digestState: DigestState,
  emit: (type: string, data: unknown) => void
): Promise<ReportChapter[]> {
  const results = await Promise.all(
    specs.map(async (spec) => {
      const ctx: ChapterGenContext = {
        targetChars: spec.targetChars,
        themeDigest: digestState.digest,
        usedPhrases: digestState.usedPhrases,
      };
      try {
        const chapter = await generateChapter(spec, board, gender, ctx);
        emit("chapter", chapter);
        return chapter;
      } catch {
        emit("error", { chapterId: spec.id });
        return null;
      }
    })
  );
  return results.filter((c): c is ReportChapter => c !== null);
}

export async function POST(req: NextRequest) {
  // 이 라우트는 Claude/Gemini API 비용이 실제로 발생하므로, 공개 배포되는 Vercel
  // 환경(고객용 /intake 전용)에서는 절대 실행되지 않도록 차단한다. 로컬 운영자 PC에서만 동작.
  if (process.env.VERCEL) {
    return new Response(JSON.stringify({ error: "이 기능은 로컬 환경에서만 사용할 수 있습니다." }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const { birthYear, birthMonth, birthDay, birthHour, gender, calendarType } = await req.json();

    if (birthHour === "모름") {
      return new Response(
        JSON.stringify({ error: "생시가 확정되지 않았습니다. /api/disambiguate로 먼저 명반을 확정해주세요." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let solarYear = birthYear, solarMonth = birthMonth, solarDay = birthDay;
    if (calendarType === "lunar") {
      const solar = lunarToSolar({ year: birthYear, month: birthMonth, day: birthDay, isLeap: false });
      solarYear = solar.year; solarMonth = solar.month; solarDay = solar.day;
    }
    const lunar = solarToLunar({ year: solarYear, month: solarMonth, day: solarDay });
    const board = calculateZamiBoard(lunar.year, lunar.month, lunar.day, birthHour as ZhiHour, gender);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const emit = (type: string, data: unknown) => {
          try {
            controller.enqueue(encoder.encode(JSON.stringify({ type, data }) + "\n"));
          } catch {
            // 클라이언트 연결 종료 시 무시
          }
        };

        try {
          let digestState: DigestState = { digest: "", usedPhrases: [] };

          const wave1 = await runWave(PREMIUM_CHAPTER_SPECS.wave1, board, gender, digestState, emit);
          digestState = extendDigest(digestState, wave1);

          const wave2 = await runWave(PREMIUM_CHAPTER_SPECS.wave2, board, gender, digestState, emit);
          digestState = extendDigest(digestState, wave2);

          const wave3 = await runWave(PREMIUM_CHAPTER_SPECS.wave3, board, gender, digestState, emit);
          digestState = extendDigest(digestState, wave3);

          await runWave(PREMIUM_CHAPTER_SPECS.wave4, board, gender, digestState, emit);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        ...corsHeaders,
      },
    });
  } catch (err) {
    console.error("[/api/premium] 전체 오류:", err);
    return new Response(JSON.stringify({ error: "리포트 생성 중 오류가 발생했습니다" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}
