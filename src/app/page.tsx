"use client";

import { useState } from "react";
import SajuInputForm, { BirthInput } from "@/components/SajuInputForm";
import ZamiBoardComponent from "@/components/ZamiBoard";
import DisambiguationQuestion from "@/components/DisambiguationQuestion";
import ResolvedBoardConfirm from "@/components/ResolvedBoardConfirm";
import { ZamiBoard, ZhiHour } from "@/core/types";
import type { DisambiguationQuestion as DisambiguationQuestionType } from "@/core/disambiguation";

type Phase = "form" | "question" | "confirm" | "result";
type DisambiguateMode = "adjacent" | "all12";

interface Answer {
  questionId: string;
  optionId: string;
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [birthInput, setBirthInput] = useState<BirthInput | null>(null);
  const [mode, setMode] = useState<DisambiguateMode>("all12");
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [question, setQuestion] = useState<DisambiguationQuestionType | null>(null);
  const [resolvedHour, setResolvedHour] = useState<ZhiHour | null>(null);
  const [resolvedBoard, setResolvedBoard] = useState<ZamiBoard | null>(null);
  const [board, setBoard] = useState<ZamiBoard | null>(null);

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
        setResolvedHour(data.resolved.hour);
        setResolvedBoard(data.resolved.board);
        setPhase("confirm");
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
        setResolvedHour(data.resolved.hour);
        setResolvedBoard(data.resolved.board);
        setPhase("confirm");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (selectedHour: ZhiHour) => {
    if (!birthInput) return;
    setLoading(true);
    setError(null);
    try {
      if (resolvedBoard && selectedHour === resolvedHour) {
        setBoard(resolvedBoard);
      } else {
        const res = await fetch("/api/board", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...birthInput, birthHour: selectedHour }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "명반 생성 중 오류가 발생했습니다");
        }
        const data: ZamiBoard = await res.json();
        setBoard(data);
      }
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPhase("form");
    setBirthInput(null);
    setAnswers([]);
    setQuestion(null);
    setResolvedHour(null);
    setResolvedBoard(null);
    setBoard(null);
    setError(null);
  };

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 4 }}>자미두수 명반</h1>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>
        생년월일시를 입력하면 자미두수 명반을 생성합니다. 생시가 불확실하면 몇 가지 질문으로 가장 알맞은 명반을 확정해요.
      </p>

      {phase === "form" && <SajuInputForm onSubmit={handleSubmit} loading={loading} />}

      {phase === "question" && question && (
        <DisambiguationQuestion question={question} onAnswer={handleAnswer} loading={loading} />
      )}

      {phase === "confirm" && resolvedHour && resolvedBoard && (
        <ResolvedBoardConfirm hour={resolvedHour} board={resolvedBoard} onConfirm={handleConfirm} loading={loading} />
      )}

      {error && (
        <div style={{ marginTop: 16, padding: "12px 16px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, color: "#dc2626", fontSize: 14 }}>
          {error}
        </div>
      )}

      {phase === "result" && board && (
        <div style={{ marginTop: 24 }}>
          <ZamiBoardComponent board={board} />
          <button
            type="button"
            onClick={handleReset}
            style={{
              marginTop: 16,
              width: "100%",
              padding: "12px",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "#fff",
              color: "#6b7280",
              cursor: "pointer",
            }}
          >
            다시 입력하기
          </button>
        </div>
      )}
    </main>
  );
}
