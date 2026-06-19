import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { calculateZamiBoard } from "@/core/calculator";
import { lunarToSolar, solarToLunar } from "@/core/lunar";
import {
  PREMIUM_SYSTEM_PROMPT_OVERVIEW,
  PREMIUM_SYSTEM_PROMPT_A,
  PREMIUM_SYSTEM_PROMPT_B,
  PREMIUM_SYSTEM_PROMPT_C,
  PREMIUM_SYSTEM_PROMPT_D,
  buildPremiumUserMessage,
} from "@/core/prompts";

export const maxDuration = 300;

const client = new Anthropic();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function callClaude(systemPrompt: string, userMessage: string, maxTokens: number): Promise<unknown> {
  for (let i = 0; i < 3; i++) {
    try {
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: maxTokens,
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userMessage }],
      });
      const aiText = message.content[0].type === "text" ? message.content[0].text : "";
      const jsonStart = aiText.indexOf("{");
      const jsonEnd = aiText.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("JSON 블록 없음");
      return JSON.parse(aiText.slice(jsonStart, jsonEnd + 1));
    } catch (err) {
      if (i === 2) throw err;
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { birthYear, birthMonth, birthDay, birthHour, gender, calendarType } = await req.json();

    let solarYear = birthYear, solarMonth = birthMonth, solarDay = birthDay;
    if (calendarType === "lunar") {
      const solar = lunarToSolar({ year: birthYear, month: birthMonth, day: birthDay, isLeap: false });
      solarYear = solar.year; solarMonth = solar.month; solarDay = solar.day;
    }
    const lunar = solarToLunar({ year: solarYear, month: solarMonth, day: solarDay });
    const board = calculateZamiBoard(lunar.year, lunar.month, lunar.day, birthHour, gender);
    const userMessage = buildPremiumUserMessage(board, gender);

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
          await Promise.all([
            callClaude(PREMIUM_SYSTEM_PROMPT_OVERVIEW, userMessage, 800)
              .then(r => emit("overview", r))
              .catch(() => emit("error", { section: "overview" })),
            callClaude(PREMIUM_SYSTEM_PROMPT_A, userMessage, 2400)
              .then(r => emit("A", r))
              .catch(() => emit("error", { section: "A" })),
            callClaude(PREMIUM_SYSTEM_PROMPT_B, userMessage, 2400)
              .then(r => emit("B", r))
              .catch(() => emit("error", { section: "B" })),
            callClaude(PREMIUM_SYSTEM_PROMPT_C, userMessage, 2000)
              .then(r => emit("C", r))
              .catch(() => emit("error", { section: "C" })),
            callClaude(PREMIUM_SYSTEM_PROMPT_D, userMessage, 1200)
              .then(r => emit("D", r))
              .catch(() => emit("error", { section: "D" })),
          ]);
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
