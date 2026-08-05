import { NextRequest, NextResponse } from "next/server";
import { ZhiHour } from "@/core/types";
import { computeCandidateBoards, getAdjacentHour } from "@/core/calculator";
import { lunarToSolar, solarToLunar } from "@/core/lunar";
import {
  advanceCandidates,
  buildSingleDisambiguationQuestion,
  nextDisambiguationQuestion,
  resolveBestCandidate,
} from "@/core/disambiguation";

export const maxDuration = 10;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const ALL_HOURS: ZhiHour[] = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];

interface BirthInput {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  calendarType: "solar" | "lunar";
  gender: "M" | "F";
  birthHour?: string; // mode: "adjacent"일 때만 필요 (모름이 아닌 실제 시진)
}

interface DisambiguateRequestBody {
  birthInput: BirthInput;
  mode: "adjacent" | "all12";
  answers?: { questionId: string; optionId: string }[];
}

export async function POST(req: NextRequest) {
  try {
    const body: DisambiguateRequestBody = await req.json();
    const { birthInput, mode } = body;
    const answers = body.answers ?? [];

    if (!birthInput?.birthYear || !birthInput?.birthMonth || !birthInput?.birthDay || !birthInput?.calendarType || !birthInput?.gender) {
      return NextResponse.json({ error: "올바른 생년월일을 입력해주세요" }, { status: 400, headers: corsHeaders });
    }
    if (mode !== "adjacent" && mode !== "all12") {
      return NextResponse.json({ error: "mode는 adjacent 또는 all12여야 합니다" }, { status: 400, headers: corsHeaders });
    }
    if (mode === "adjacent" && (!birthInput.birthHour || birthInput.birthHour === "모름")) {
      return NextResponse.json(
        { error: "mode가 adjacent인 경우 birthHour(실제 시진)가 필요합니다. 생시를 전혀 모르면 mode를 all12로 사용하세요." },
        { status: 400, headers: corsHeaders }
      );
    }

    let solarYear = birthInput.birthYear, solarMonth = birthInput.birthMonth, solarDay = birthInput.birthDay;
    if (birthInput.calendarType === "lunar") {
      const solar = lunarToSolar({ year: birthInput.birthYear, month: birthInput.birthMonth, day: birthInput.birthDay, isLeap: false });
      solarYear = solar.year; solarMonth = solar.month; solarDay = solar.day;
    }
    const lunar = solarToLunar({ year: solarYear, month: solarMonth, day: solarDay });

    const hours: ZhiHour[] =
      mode === "adjacent"
        ? (() => {
            const stated = birthInput.birthHour as ZhiHour;
            return [getAdjacentHour(stated, -1), stated, getAdjacentHour(stated, 1)];
          })()
        : ALL_HOURS;

    const candidates = computeCandidateBoards(lunar.year, lunar.month, lunar.day, birthInput.gender, hours);
    const anchorHour = mode === "adjacent" ? (birthInput.birthHour as ZhiHour) : undefined;

    const { remaining, askedQuestionIds } = advanceCandidates(mode, candidates, answers);

    const nextQuestion =
      mode === "adjacent"
        ? buildSingleDisambiguationQuestion(remaining)
        : nextDisambiguationQuestion(remaining, askedQuestionIds);

    if (nextQuestion) {
      return NextResponse.json({ nextQuestion, resolved: null }, { headers: corsHeaders });
    }

    const best = resolveBestCandidate(mode, candidates, answers, anchorHour);
    return NextResponse.json(
      { nextQuestion: null, resolved: { hour: best.hour, board: best.board } },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("[/api/disambiguate] error:", err);
    return NextResponse.json({ error: "생시 확정 중 오류가 발생했습니다" }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
