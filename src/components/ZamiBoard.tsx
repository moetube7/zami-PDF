"use client";

import { ZamiBoard as ZamiBoardType } from "@/core/types";

interface Props {
  board: ZamiBoardType;
}

const ZHI_TO_GRID: Record<number, string> = {
  5:  "1/1/2/2",
  6:  "1/2/2/3",
  7:  "1/3/2/4",
  8:  "1/4/2/5",
  4:  "2/1/3/2",
  9:  "2/4/3/5",
  3:  "3/1/4/2",
  10: "3/4/4/5",
  2:  "4/1/5/2",
  1:  "4/2/5/3",
  0:  "4/3/5/4",
  11: "4/4/5/5",
};

const ZHI_NAMES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const SIHUA = new Set(["화록", "화권", "화과", "화기"]);
const WUXING_NAMES: Record<number, string> = { 2: "수", 3: "목", 4: "금", 5: "토", 6: "화" };

export default function ZamiBoardComponent({ board }: Props) {
  const palacesByZhi: Record<number, typeof board.palaces[string]> = {};
  for (const palace of Object.values(board.palaces)) {
    palacesByZhi[palace.position] = palace;
  }

  return (
    <div style={{ padding: 12 }}>
      <p style={{ fontSize: 13, color: "#666", textAlign: "center", margin: "0 0 10px", fontWeight: 500 }}>
        자미두수 12궁 명반
      </p>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gridTemplateRows: "repeat(4, 1fr)",
        gap: 5,
        width: "100%",
        aspectRatio: "1",
      }}>
        {Object.entries(ZHI_TO_GRID).map(([zhiStr, gridArea]) => {
          const zhi = Number(zhiStr);
          const palace = palacesByZhi[zhi];
          const stars = palace?.stars ?? [];
          const minorStars = palace?.minorStars ?? [];
          const isMing = palace?.name === "명궁";

          return (
            <div
              key={zhi}
              style={{
                gridArea,
                border: `1px solid ${isMing ? "#6366f1" : "#e5e7eb"}`,
                borderRadius: 6,
                padding: "8px 7px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                background: isMing ? "#eef2ff" : "#fff",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: isMing ? "#6366f1" : "#6b7280", letterSpacing: "-0.3px" }}>
                  {palace?.name ?? ""}
                </span>
                <span style={{ fontSize: 10, color: "#9ca3af" }}>
                  {ZHI_NAMES[zhi]}
                </span>
              </div>
              {stars.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {stars.map((star) => (
                    <span key={star} style={{ fontSize: 12, color: "#d97706", lineHeight: 1.3, fontWeight: 500 }}>
                      {star}
                    </span>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: 11, color: "#9ca3af" }}>공궁</span>
              )}
              {minorStars.length > 0 && (
                <div style={{ marginTop: 2, display: "flex", flexWrap: "wrap", gap: "1px 3px" }}>
                  {minorStars.map((star) => (
                    <span
                      key={star}
                      style={{
                        fontSize: 10,
                        lineHeight: 1.4,
                        color: SIHUA.has(star) ? "#ef4444" : "#9ca3af",
                        fontWeight: SIHUA.has(star) ? 600 : 400,
                      }}
                    >
                      {star}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div style={{
          gridColumn: "2/4",
          gridRow: "2/4",
          border: "1px solid #e5e7eb",
          borderRadius: 6,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9fafb",
          gap: 4,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#4f46e5" }}>자미(ZAMI)</div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>명궁: {board.mingGong}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>{WUXING_NAMES[board.fiveElementGroup]}{board.fiveElementGroup}국</div>
        </div>
      </div>
    </div>
  );
}
