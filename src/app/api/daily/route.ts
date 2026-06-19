import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { DailyRequest, DailyFortune } from "@/core/types";
import { calculateZamiBoard } from "@/core/calculator";
import { solarToLunar } from "@/core/lunar";
import { DAILY_SYSTEM_PROMPT, buildDailyUserMessage } from "@/core/prompts";

export const maxDuration = 60;

const client = new Anthropic();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function POST(req: NextRequest) {
  try {
    const body: DailyRequest = await req.json();
    const { birthYear, birthMonth, birthDay, birthHour, gender, today } = body;

    if (!birthYear || !birthMonth || !birthDay || !birthHour || !gender || !today) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다" }, { status: 400, headers: corsHeaders });
    }

    const lunar = solarToLunar({ year: birthYear, month: birthMonth, day: birthDay });
    const board = calculateZamiBoard(lunar.year, lunar.month, lunar.day, birthHour, gender);

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: [{ type: "text", text: DAILY_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: buildDailyUserMessage(body, board) }],
    });

    const aiText = message.content[0].type === "text" ? message.content[0].text : "";
    const cleanedText = aiText.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (e) {
      console.error("[/api/daily] JSON 파싱 실패:", e);
      return NextResponse.json({ error: "운세 생성 중 오류가 발생했습니다" }, { status: 500, headers: corsHeaders });
    }

    const result: DailyFortune = {
      date: today,
      summary: parsed.summary,
      details: {
        총운: { text: parsed.details.총운, isLocked: false },
        재물운: { text: parsed.details.재물운, isLocked: false },
        대인운: { text: parsed.details.대인운, isLocked: false },
        건강운: { text: parsed.details.건강운, isLocked: false },
      },
    };

    return NextResponse.json(result, { headers: corsHeaders });
  } catch (e) {
    console.error("[/api/daily] 오류:", e);
    return NextResponse.json({ error: "운세 생성 중 오류가 발생했습니다" }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
