"use client";

import { useState } from "react";
import SajuInputForm, { BirthInput } from "@/components/SajuInputForm";
import ZamiBoardComponent from "@/components/ZamiBoard";
import { ZamiBoard } from "@/core/types";

export default function Home() {
  const [board, setBoard] = useState<ZamiBoard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (input: BirthInput) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "오류가 발생했습니다");
      }
      const data: ZamiBoard = await res.json();
      setBoard(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 4 }}>자미두수 명반</h1>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>생년월일시를 입력하면 자미두수 명반을 생성합니다</p>

      <SajuInputForm onSubmit={handleSubmit} loading={loading} />

      {error && (
        <div style={{ marginTop: 16, padding: "12px 16px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, color: "#dc2626", fontSize: 14 }}>
          {error}
        </div>
      )}

      {board && (
        <div style={{ marginTop: 24 }}>
          <ZamiBoardComponent board={board} />
        </div>
      )}
    </main>
  );
}
