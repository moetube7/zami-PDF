import { NextRequest, NextResponse } from "next/server";
import { calculateZamiBoard } from "@/core/calculator";
import { lunarToSolar, solarToLunar } from "@/core/lunar";

export const maxDuration = 10;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function POST(req: NextRequest) {
  try {
    const { birthYear, birthMonth, birthDay, birthHour, calendarType, gender } = await req.json();

    if (!birthYear || !birthMonth || !birthDay || !birthHour || !calendarType || !gender) {
      return NextResponse.json({ error: "올바른 생년월일을 입력해주세요" }, { status: 400 });
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

    return NextResponse.json(board, { headers: corsHeaders });
  } catch (err) {
    console.error("[/api/board] error:", err);
    return NextResponse.json({ error: "명반 계산 중 오류가 발생했습니다" }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
