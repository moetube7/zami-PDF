"use client";

import type { DisambiguationQuestion as DisambiguationQuestionType } from "@/core/disambiguation";

interface Props {
  question: DisambiguationQuestionType;
  onAnswer: (optionId: string) => void;
  loading?: boolean;
}

export default function DisambiguationQuestion({ question, onAnswer, loading }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#6b7280" }}>생시 확정을 위한 질문</p>
      <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", lineHeight: 1.5 }}>{question.prompt}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {question.options.map((option, i) => (
          <button
            key={option.id}
            type="button"
            disabled={loading}
            onClick={() => onAnswer(option.id)}
            style={{
              textAlign: "left",
              padding: "14px 16px",
              fontSize: 13,
              lineHeight: 1.5,
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "#fff",
              color: "#111827",
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            <span style={{ fontWeight: 700, color: "#6366f1", marginRight: 6 }}>
              {String.fromCharCode(9312 + i)}
            </span>
            {option.text}
          </button>
        ))}
      </div>
    </div>
  );
}
