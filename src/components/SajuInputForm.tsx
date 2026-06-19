"use client";

import { useState } from "react";

const BIRTH_HOURS = [
  "자", "축", "인", "묘", "진", "사",
  "오", "미", "신", "유", "술", "해"
];

const BIRTH_HOUR_TIMES: Record<string, string> = {
  "자": "23:31~01:30", "축": "01:31~03:30", "인": "03:31~05:30", "묘": "05:31~07:30",
  "진": "07:31~09:30", "사": "09:31~11:30", "오": "11:31~13:30", "미": "13:31~15:30",
  "신": "15:31~17:30", "유": "17:31~19:30", "술": "19:31~21:30", "해": "21:31~23:30",
  "모름": "시간 모름"
};

export interface BirthInput {
  calendarType: "solar" | "lunar";
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: string;
  gender: "M" | "F";
}

interface Props {
  onSubmit: (input: BirthInput) => void;
  loading?: boolean;
}

export default function SajuInputForm({ onSubmit, loading }: Props) {
  const currentYear = new Date().getFullYear();

  const [form, setForm] = useState<BirthInput>({
    calendarType: "solar",
    birthYear: 1990,
    birthMonth: 1,
    birthDay: 1,
    birthHour: "모름",
    gender: "F",
  });

  const years = Array.from({ length: currentYear - 1900 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const selectStyle: React.CSSProperties = {
    flex: 1,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    color: "#111827",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: "#6b7280",
    marginBottom: 8,
    display: "block",
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 양력/음력 */}
      <div>
        <label style={labelStyle}>달력 기준</label>
        <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 10, padding: 4, gap: 4 }}>
          {(["solar", "lunar"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setForm({ ...form, calendarType: type })}
              style={{
                flex: 1,
                padding: "8px 0",
                fontSize: 14,
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontWeight: form.calendarType === type ? 600 : 400,
                background: form.calendarType === type ? "#fff" : "transparent",
                color: form.calendarType === type ? "#111827" : "#6b7280",
                boxShadow: form.calendarType === type ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {type === "solar" ? "양력" : "음력"}
            </button>
          ))}
        </div>
      </div>

      {/* 생년월일 */}
      <div>
        <label style={labelStyle}>생년월일</label>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={form.birthYear} onChange={(e) => setForm({ ...form, birthYear: Number(e.target.value) })} style={{ ...selectStyle, flex: 1.6 }}>
            {years.map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={form.birthMonth} onChange={(e) => setForm({ ...form, birthMonth: Number(e.target.value) })} style={selectStyle}>
            {months.map((m) => <option key={m} value={m}>{m}월</option>)}
          </select>
          <select value={form.birthDay} onChange={(e) => setForm({ ...form, birthDay: Number(e.target.value) })} style={selectStyle}>
            {days.map((d) => <option key={d} value={d}>{d}일</option>)}
          </select>
        </div>
      </div>

      {/* 태어난 시간 */}
      <div>
        <label style={labelStyle}>태어난 시간</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          {BIRTH_HOURS.map((hour) => (
            <button
              key={hour}
              type="button"
              onClick={() => setForm({ ...form, birthHour: hour })}
              style={{
                padding: "8px 4px",
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid",
                cursor: "pointer",
                borderColor: form.birthHour === hour ? "#6366f1" : "#e5e7eb",
                background: form.birthHour === hour ? "#eef2ff" : "#fff",
                color: form.birthHour === hour ? "#6366f1" : "#111827",
              }}
            >
              <div style={{ fontWeight: form.birthHour === hour ? 600 : 400 }}>{hour}시</div>
              <div style={{ fontSize: 9, color: form.birthHour === hour ? "#6366f1" : "#9ca3af", marginTop: 2 }}>
                {BIRTH_HOUR_TIMES[hour]}
              </div>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setForm({ ...form, birthHour: "모름" })}
          style={{
            marginTop: 6,
            width: "calc(25% - 4.5px)",
            padding: "8px 4px",
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid",
            cursor: "pointer",
            borderColor: form.birthHour === "모름" ? "#6366f1" : "#e5e7eb",
            background: form.birthHour === "모름" ? "#eef2ff" : "#fff",
            color: form.birthHour === "모름" ? "#6366f1" : "#111827",
          }}
        >
          <div style={{ fontWeight: form.birthHour === "모름" ? 600 : 400 }}>모름시</div>
          <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 2 }}>시간 모름</div>
        </button>
      </div>

      {/* 성별 */}
      <div>
        <label style={labelStyle}>성별</label>
        <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 10, padding: 4, gap: 4 }}>
          {(["F", "M"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setForm({ ...form, gender: g })}
              style={{
                flex: 1,
                padding: "8px 0",
                fontSize: 14,
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontWeight: form.gender === g ? 600 : 400,
                background: form.gender === g ? "#fff" : "transparent",
                color: form.gender === g ? "#111827" : "#6b7280",
                boxShadow: form.gender === g ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {g === "F" ? "여성" : "남성"}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: "14px",
          fontSize: 16,
          fontWeight: 700,
          borderRadius: 12,
          border: "none",
          cursor: loading ? "default" : "pointer",
          background: loading ? "#a5b4fc" : "#6366f1",
          color: "#fff",
        }}
      >
        {loading ? "분석 중..." : "✨ 자미두수 명반 생성"}
      </button>
    </form>
  );
}
