import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { AnalyzeRequest, AnalysisResult, AnalysisCard } from "@/core/types";
import { calculateZamiBoard } from "@/core/calculator";
import { lunarToSolar, solarToLunar } from "@/core/lunar";
import { FREE_ANALYSIS_SYSTEM_PROMPT, LOCKED_ANALYSIS_SYSTEM_PROMPT, ZAMI_ADVANTAGES, buildAnalysisUserMessage } from "@/core/prompts";

export const maxDuration = 120;

const client = new Anthropic();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function POST(req: NextRequest) {
  try {
    const body: AnalyzeRequest = await req.json();
    const { birthYear, birthMonth, birthDay, birthHour, calendarType, gender, type = "free" } = body;

    if (!birthYear || !birthMonth || !birthDay || !birthHour || !calendarType || !gender) {
      return NextResponse.json({ error: "올바른 생년월일을 입력해주세요" }, { status: 400 });
    }
    if (birthYear > new Date().getFullYear()) {
      return NextResponse.json({ error: "미래 날짜는 입력할 수 없어요" }, { status: 400 });
    }

    let solarYear = birthYear, solarMonth = birthMonth, solarDay = birthDay;
    if (calendarType === "lunar") {
      const solar = lunarToSolar({ year: birthYear, month: birthMonth, day: birthDay, isLeap: false });
      solarYear = solar.year;
      solarMonth = solar.month;
      solarDay = solar.day;
    }

    const lunar = solarToLunar({ year: solarYear, month: solarMonth, day: solarDay });
    const board = calculateZamiBoard(lunar.year, lunar.month, lunar.day, birthHour, gender);

    const systemPrompt = type === "locked" ? LOCKED_ANALYSIS_SYSTEM_PROMPT : FREE_ANALYSIS_SYSTEM_PROMPT;
    const isLockedType = type === "locked";
    const userMessage = buildAnalysisUserMessage(board, gender, type as "free" | "locked");

    let crossAnalysis: AnalysisCard[] | null = null;
    let parsedSummary: string | undefined;

    for (let attempt = 0; attempt < 3; attempt++) {
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: isLockedType ? 2200 : 1800,
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userMessage }],
      });

      const aiText = message.content[0].type === "text" ? message.content[0].text : "";
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      const cleanedText = jsonMatch ? jsonMatch[0].trim() : aiText.replace(/```(?:json)?\n?/g, "").trim();

      try {
        const parsed = JSON.parse(cleanedText);
        crossAnalysis = parsed.crossAnalysis.map((card: { id: string; area: string; interpretation: string }) => ({
          ...card,
          zamiAdvantage: ZAMI_ADVANTAGES[card.id] ?? "",
          isLocked: isLockedType,
        }));
        if (parsed.summary) parsedSummary = parsed.summary as string;
        break;
      } catch {
        if (attempt === 2) {
          return NextResponse.json({ error: "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요" }, { status: 500 });
        }
      }
    }

    const result: AnalysisResult = {
      mingpan: board,
      crossAnalysis: crossAnalysis!,
      ...(type === "free" && parsedSummary ? { summary: parsedSummary } : {}),
    };

    return NextResponse.json(result, { headers: corsHeaders });
  } catch (err) {
    console.error("[/api/analyze] error:", err);
    return NextResponse.json({ error: "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요" }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
