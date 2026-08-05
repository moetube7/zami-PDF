"use client";

import { useState } from "react";
import type { ZamiBoard, ZhiHour } from "@/core/types";

const ALL_HOURS: ZhiHour[] = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];

interface Props {
  hour: ZhiHour;
  board: ZamiBoard;
  onConfirm: (hour: ZhiHour) => void;
  loading?: boolean;
}

export default function ResolvedBoardConfirm({ hour, board, onConfirm, loading }: Props) {
  const [selectedHour, setSelectedHour] = useState<ZhiHour>(hour);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#6b7280" }}>명반이 확정되었습니다</p>

      <div style={{ padding: "14px 16px", borderRadius: 10, border: "1px solid #6366f1", background: "#eef2ff" }}>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>확정된 시진</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#4f46e5" }}>{selectedHour}시</div>
        <div style={{ fontSize: 13, color: "#374151", marginTop: 6 }}>명궁: {board.mingGong}</div>
      </div>

      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 6 }}>
          질문에 확신이 서지 않으면 직접 시진을 선택할 수도 있어요 (수동 오버라이드)
        </label>
        <select
          value={selectedHour}
          onChange={(e) => setSelectedHour(e.target.value as ZhiHour)}
          style={{
            width: "100%",
            padding: "10px 12px",
            fontSize: 14,
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "#fff",
            color: "#111827",
          }}
        >
          {ALL_HOURS.map((h) => (
            <option key={h} value={h}>
              {h}시{h === hour ? " (질문으로 확정된 시진)" : ""}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={() => onConfirm(selectedHour)}
        style={{
          padding: "14px",
          fontSize: 15,
          fontWeight: 700,
          borderRadius: 12,
          border: "none",
          cursor: loading ? "default" : "pointer",
          background: loading ? "#a5b4fc" : "#6366f1",
          color: "#fff",
        }}
      >
        {loading ? "명반 생성 중..." : `${selectedHour}시로 명반 확정`}
      </button>
    </div>
  );
}
