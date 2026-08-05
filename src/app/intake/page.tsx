"use client";

import { useState } from "react";
import SajuInputForm, { BirthInput } from "@/components/SajuInputForm";
import DisambiguationQuestion from "@/components/DisambiguationQuestion";
import { ZamiBoard, ZhiHour } from "@/core/types";
import { encodeIntakeCode } from "@/core/intakeCode";
import type { DisambiguationQuestion as DisambiguationQuestionType } from "@/core/disambiguation";

type Phase = "form" | "question" | "done";
type DisambiguateMode = "adjacent" | "all12";

interface Answer {
  questionId: string;
  optionId: string;
}

export default function IntakePage() {
  const [phase, setPhase] = useState<Phase>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [birthInput, setBirthInput] = useState<BirthInput | null>(null);
  const [mode, setMode] = useState<DisambiguateMode>("all12");
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [question, setQuestion] = useState<DisambiguationQuestionType | null>(null);

  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const callDisambiguate = async (input: BirthInput, m: DisambiguateMode, currentAnswers: Answer[]) => {
    const res = await fetch("/api/disambiguate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birthInput: input, mode: m, answers: currentAnswers }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "생시 확정 중 오류가 발생했습니다");
    }
    return res.json() as Promise<{
      nextQuestion: DisambiguationQuestionType | null;
      resolved: { hour: ZhiHour; board: ZamiBoard } | null;
    }>;
  };

  const finish = (input: BirthInput, hour: ZhiHour, board: ZamiBoard) => {
    const submissionCode = encodeIntakeCode({
      name: input.name?.trim() || "",
      birthInput: { ...input, birthHour: hour },
      board,
    });
    setCode(submissionCode);
    setPhase("done");
  };

  const handleSubmit = async (input: BirthInput) => {
    setLoading(true);
    setError(null);
    try {
      const m: DisambiguateMode = input.birthHour === "모름" ? "all12" : "adjacent";
      setBirthInput(input);
      setMode(m);
      setAnswers([]);

      const data = await callDisambiguate(input, m, []);
      if (data.nextQuestion) {
        setQuestion(data.nextQuestion);
        setPhase("question");
      } else if (data.resolved) {
        finish(input, data.resolved.hour, data.resolved.board);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (optionId: string) => {
    if (!birthInput || !question) return;
    setLoading(true);
    setError(null);
    try {
      const nextAnswers = [...answers, { questionId: question.id, optionId }];
      setAnswers(nextAnswers);

      const data = await callDisambiguate(birthInput, mode, nextAnswers);
      if (data.nextQuestion) {
        setQuestion(data.nextQuestion);
      } else if (data.resolved) {
        finish(birthInput, data.resolved.hour, data.resolved.board);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("복사에 실패했습니다. 코드를 직접 선택해서 복사해주세요.");
    }
  };

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 4 }}>자미두수 프리미엄 리포트</h1>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>
        정확한 리포트 작성을 위해 아래 정보를 입력해주세요. 생시가 확실하지 않으면 간단한 질문 몇 가지로 가장 알맞은
        명반을 확정해드립니다.
      </p>

      {phase === "form" && (
        <SajuInputForm onSubmit={handleSubmit} loading={loading} requireName submitLabel="다음" />
      )}

      {phase === "question" && question && (
        <DisambiguationQuestion question={question} onAnswer={handleAnswer} loading={loading} />
      )}

      {phase === "done" && code && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ padding: "16px 18px", borderRadius: 10, border: "1px solid #16a34a", background: "#f0fdf4" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#16a34a" }}>입력이 완료됐습니다!</p>
            <p style={{ fontSize: 13, color: "#374151", marginTop: 6 }}>
              아래 코드를 복사해서 카카오톡으로 보내주세요. 코드를 받으시면 리포트 제작이 시작됩니다.
            </p>
          </div>

          <textarea
            readOnly
            value={code}
            rows={4}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: 12,
              fontFamily: "monospace",
              color: "#374151",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              background: "#f9fafb",
              resize: "none",
            }}
            onFocus={(e) => e.currentTarget.select()}
          />

          <button
            type="button"
            onClick={handleCopy}
            style={{
              padding: "14px",
              fontSize: 15,
              fontWeight: 700,
              borderRadius: 12,
              border: "none",
              background: copied ? "#16a34a" : "#6366f1",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {copied ? "복사됨!" : "코드 복사하기"}
          </button>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 16, padding: "12px 16px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, color: "#dc2626", fontSize: 14 }}>
          {error}
        </div>
      )}
    </main>
  );
}
