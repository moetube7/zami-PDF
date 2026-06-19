import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { calculateZamiBoard } from "@/core/calculator";
import { lunarToSolar, solarToLunar } from "@/core/lunar";
import { getConsultPrompt, buildConsultUserMessage } from "@/core/prompts";

export const maxDuration = 60;

const client = new Anthropic();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function extractJson(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("JSON 없음");
  return JSON.parse(text.slice(start, end + 1));
}

async function callWithRetry(
  fn: () => Promise<Record<string, unknown>>,
  retries = 3,
): Promise<Record<string, unknown>> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
    }
  }
  throw new Error("unreachable");
}

export async function POST(req: NextRequest) {
  try {
    const { birthYear, birthMonth, birthDay, birthHour, gender, calendarType, category, concern } = await req.json();

    if (!category) {
      return new Response(JSON.stringify({ error: "카테고리를 선택해주세요" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let solarYear = birthYear, solarMonth = birthMonth, solarDay = birthDay;
    if (calendarType === "lunar") {
      const solar = lunarToSolar({ year: birthYear, month: birthMonth, day: birthDay, isLeap: false });
      solarYear = solar.year; solarMonth = solar.month; solarDay = solar.day;
    }
    const lunar = solarToLunar({ year: solarYear, month: solarMonth, day: solarDay });
    const board = calculateZamiBoard(lunar.year, lunar.month, lunar.day, birthHour, gender);
    const systemPrompt = getConsultPrompt(category);
    const userMessage = buildConsultUserMessage(board, gender, concern?.trim() ?? "");

    const pass1Result = await callWithRetry(async () => {
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userMessage }],
      });
      const text = message.content[0].type === "text" ? message.content[0].text : "";
      const parsed = extractJson(text);
      if (!parsed.categoryTitle) throw new Error("pass1 응답 파싱 실패");
      return parsed;
    });

    let overallConclusion: string | undefined;
    try {
      const conclusionSystem = `자미두수 상담 분석 결과를 읽고, 핵심 결론을 한 문장으로 작성하세요.\n반드시 유효한 JSON만 반환하세요: {"overallConclusion": "(한 문장 핵심 결론. 구체적 시기·조건·방향 포함)"}`;
      const conclusionUser = `다음 분석을 종합하여 한 문장 결론을 작성하세요:\n명반 분석: ${pass1Result.mingpanInsight}\n고민 답변: ${pass1Result.concernAnalysis}\n조언: ${pass1Result.advice}\n시기: ${pass1Result.timing}`;

      const pass2 = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system: conclusionSystem,
        messages: [{ role: "user", content: conclusionUser }],
      });
      const pass2Text = pass2.content[0].type === "text" ? pass2.content[0].text : "";
      const pass2Json = extractJson(pass2Text);
      if (typeof pass2Json.overallConclusion === "string") {
        overallConclusion = pass2Json.overallConclusion;
      }
    } catch (err) {
      console.warn("[/api/consult] pass2 실패 (결론 생략):", err);
    }

    const result = overallConclusion
      ? { ...pass1Result, overallConclusion }
      : pass1Result;

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("[/api/consult] 오류:", err);
    return new Response(JSON.stringify({ error: "분석 중 오류가 발생했습니다" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}
