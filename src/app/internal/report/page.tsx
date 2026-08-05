"use client";

import { useState } from "react";
import SajuInputForm, { BirthInput } from "@/components/SajuInputForm";
import DisambiguationQuestion from "@/components/DisambiguationQuestion";
import ResolvedBoardConfirm from "@/components/ResolvedBoardConfirm";
import { ZamiBoard, ZhiHour, ReportChapter, ReportDocument } from "@/core/types";
import type { DisambiguationQuestion as DisambiguationQuestionType } from "@/core/disambiguation";
import { decodeIntakeCode } from "@/core/intakeCode";

type Phase = "entry" | "pasteCode" | "form" | "question" | "confirm" | "generating" | "done";
type DisambiguateMode = "adjacent" | "all12";
type ChapterStatus = "done" | "error";

interface Answer {
  questionId: string;
  optionId: string;
}

const TOTAL_CHAPTERS = 19;

export default function InternalReportPage() {
  const [phase, setPhase] = useState<Phase>("entry");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pastedCode, setPastedCode] = useState("");

  const [birthInput, setBirthInput] = useState<BirthInput | null>(null);
  const [mode, setMode] = useState<DisambiguateMode>("all12");
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [question, setQuestion] = useState<DisambiguationQuestionType | null>(null);
  const [resolvedHour, setResolvedHour] = useState<ZhiHour | null>(null);
  const [resolvedBoard, setResolvedBoard] = useState<ZamiBoard | null>(null);

  const [chapterProgress, setChapterProgress] = useState<{ id: string; title: string; status: ChapterStatus }[]>([]);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

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

  const handleLoadFromCode = () => {
    setError(null);
    try {
      const submission = decodeIntakeCode(pastedCode);
      setBirthInput(submission.birthInput);
      setResolvedHour(submission.birthInput.birthHour as ZhiHour);
      setResolvedBoard(submission.board);
      setPhase("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "코드를 불러오지 못했습니다");
    }
  };

  const handleConfirmAndGenerate = async (selectedHour: ZhiHour) => {
    if (!birthInput) return;
    setError(null);
    setPhase("generating");
    setChapterProgress([]);
    setSavedPath(null);
    setDownloadUrl(null);

    try {
      const finalInput = { ...birthInput, birthHour: selectedHour };

      const res = await fetch("/api/premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalInput),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "리포트 생성 요청에 실패했습니다" }));
        throw new Error(err.error ?? "리포트 생성 요청에 실패했습니다");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const chapters: ReportChapter[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as { type: string; data: unknown };
          if (event.type === "chapter") {
            const chapter = event.data as ReportChapter;
            chapters.push(chapter);
            setChapterProgress((prev) => [...prev, { id: chapter.id, title: chapter.title, status: "done" }]);
          } else if (event.type === "error") {
            const { chapterId } = event.data as { chapterId: string };
            setChapterProgress((prev) => [...prev, { id: chapterId, title: chapterId, status: "error" }]);
          }
        }
      }

      if (chapters.length === 0) {
        throw new Error("생성된 챕터가 없습니다. 다시 시도해주세요.");
      }

      const genderText = finalInput.gender === "M" ? "남성" : "여성";
      const namePrefix = finalInput.name?.trim() ? `${finalInput.name.trim()}님 ` : "";
      const doc: ReportDocument = {
        meta: {
          customerLabel: `${namePrefix}(${finalInput.birthYear}년 ${finalInput.birthMonth}월 ${finalInput.birthDay}일, ${selectedHour}시, ${genderText})`,
          generatedAt: new Date().toISOString().slice(0, 10),
          boardSummary: resolvedBoard?.mingGong ?? "",
        },
        board: resolvedBoard as ZamiBoard,
        chapters,
      };

      const pdfRes = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(doc),
      });
      if (!pdfRes.ok) {
        const err = await pdfRes.json().catch(() => ({ error: "PDF 생성에 실패했습니다" }));
        throw new Error(err.error ?? "PDF 생성에 실패했습니다");
      }

      const savedHeader = pdfRes.headers.get("X-Saved-Path");
      const saved = savedHeader ? decodeURIComponent(savedHeader) : null;
      const blob = await pdfRes.blob();
      setSavedPath(saved);
      setDownloadUrl(URL.createObjectURL(blob));
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
      setPhase("confirm");
    }
  };

  const handleReset = () => {
    setPhase("entry");
    setPastedCode("");
    setBirthInput(null);
    setAnswers([]);
    setQuestion(null);
    setResolvedHour(null);
    setResolvedBoard(null);
    setChapterProgress([]);
    setSavedPath(null);
    setDownloadUrl(null);
    setError(null);
  };

  const doneCount = chapterProgress.filter((c) => c.status === "done").length;
  const errorCount = chapterProgress.filter((c) => c.status === "error").length;

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "24px 20px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 4 }}>운영자 도구 — 프리미엄 리포트 생성</h1>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>
        고객의 생년월일시를 입력하면 생시 확정 → 챕터별 콘텐츠·삽화 생성 → PDF 저장까지 자동으로 진행됩니다.
      </p>

      {phase === "entry" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            onClick={() => setPhase("pasteCode")}
            style={{
              textAlign: "left",
              padding: "16px 18px",
              borderRadius: 12,
              border: "1px solid #6366f1",
              background: "#eef2ff",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: "#4f46e5" }}>완료 코드 붙여넣기 (권장)</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              고객이 /intake 페이지에서 직접 입력을 마치고 카카오톡으로 보낸 코드를 붙여넣습니다.
            </div>
          </button>
          <button
            type="button"
            onClick={() => setPhase("form")}
            style={{
              textAlign: "left",
              padding: "16px 18px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>직접 입력하기</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              운영자가 카톡 등으로 전달받은 정보를 직접 입력합니다 (백업용).
            </div>
          </button>
        </div>
      )}

      {phase === "pasteCode" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#6b7280" }}>고객이 보낸 완료 코드</label>
          <textarea
            value={pastedCode}
            onChange={(e) => setPastedCode(e.target.value)}
            rows={5}
            placeholder="ZP1.eyJ... 로 시작하는 코드를 붙여넣으세요"
            style={{
              width: "100%",
              padding: "12px",
              fontSize: 12,
              fontFamily: "monospace",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              background: "#f9fafb",
              resize: "vertical",
            }}
          />
          <button
            type="button"
            onClick={handleLoadFromCode}
            disabled={!pastedCode.trim()}
            style={{
              padding: "14px",
              fontSize: 15,
              fontWeight: 700,
              borderRadius: 12,
              border: "none",
              background: pastedCode.trim() ? "#6366f1" : "#a5b4fc",
              color: "#fff",
              cursor: pastedCode.trim() ? "pointer" : "default",
            }}
          >
            명반 불러오기
          </button>
          <button
            type="button"
            onClick={() => setPhase("entry")}
            style={{ padding: "10px", fontSize: 13, borderRadius: 10, border: "none", background: "transparent", color: "#6b7280", cursor: "pointer" }}
          >
            ← 뒤로
          </button>
        </div>
      )}

      {phase === "form" && <SajuInputForm onSubmit={handleSubmit} loading={loading} />}

      {phase === "question" && question && (
        <DisambiguationQuestion question={question} onAnswer={handleAnswer} loading={loading} />
      )}

      {phase === "confirm" && resolvedHour && resolvedBoard && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {birthInput?.name?.trim() && (
            <p style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{birthInput.name.trim()}님</p>
          )}
          <ResolvedBoardConfirm hour={resolvedHour} board={resolvedBoard} onConfirm={handleConfirmAndGenerate} loading={false} />
        </div>
      )}

      {phase === "generating" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#6b7280" }}>
            리포트 생성 중... ({doneCount + errorCount}/{TOTAL_CHAPTERS}
            {errorCount > 0 ? `, 실패 ${errorCount}건` : ""})
          </p>
          <div style={{ width: "100%", height: 8, borderRadius: 4, background: "#f3f4f6", overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.min(100, ((doneCount + errorCount) / TOTAL_CHAPTERS) * 100)}%`,
                height: "100%",
                background: "#6366f1",
                transition: "width 0.3s",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 400, overflowY: "auto" }}>
            {chapterProgress.map((c, i) => (
              <div key={`${c.id}-${i}`} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <span style={{ color: c.status === "done" ? "#16a34a" : "#dc2626" }}>{c.status === "done" ? "✓" : "✗"}</span>
                <span style={{ color: "#374151" }}>{c.title}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "#9ca3af" }}>
            챕터 텍스트 19개와 삽화 19장을 순서대로 생성합니다. 몇 분 정도 걸릴 수 있어요.
          </p>
        </div>
      )}

      {phase === "done" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ padding: "16px 18px", borderRadius: 10, border: "1px solid #16a34a", background: "#f0fdf4" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#16a34a", marginBottom: 6 }}>리포트 생성이 완료됐습니다</p>
            {savedPath && (
              <p style={{ fontSize: 12, color: "#374151", wordBreak: "break-all" }}>저장 위치: {savedPath}</p>
            )}
            {errorCount > 0 && (
              <p style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>
                {errorCount}개 챕터 생성에 실패했습니다. PDF에는 나머지 챕터만 포함되어 있으니 필요하면 다시 생성해주세요.
              </p>
            )}
          </div>
          {downloadUrl && (
            <a
              href={downloadUrl}
              download="zami-report.pdf"
              style={{
                textAlign: "center",
                padding: "14px",
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 12,
                background: "#6366f1",
                color: "#fff",
                textDecoration: "none",
              }}
            >
              PDF 다운로드
            </a>
          )}
          <button
            type="button"
            onClick={handleReset}
            style={{
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
            새 리포트 만들기
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
