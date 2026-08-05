import type { BirthInput } from "@/components/SajuInputForm";
import type { ZamiBoard } from "./types";

// 고객 셀프서비스 입력(/intake) 완료 후 발급되는 "완료 코드"의 인코딩/디코딩.
// 서버 저장소가 전혀 없는 self-contained 방식 — 코드 자체에 모든 정보가 담겨 있어
// 운영자 로컬 도구가 네트워크 호출 없이 그대로 복원할 수 있다 (DB/KV 불필요).

export interface IntakeSubmission {
  name: string;
  birthInput: BirthInput; // birthHour는 이미 확정된 값 ("모름"이 아님)
  board: ZamiBoard;
}

function utf8ToBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToUtf8(b64url: string): string {
  let base64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

const CODE_PREFIX = "ZP1"; // 포맷 버전 표시 (향후 스키마 변경 대비)

export function encodeIntakeCode(submission: IntakeSubmission): string {
  return `${CODE_PREFIX}.${utf8ToBase64Url(JSON.stringify(submission))}`;
}

export function decodeIntakeCode(code: string): IntakeSubmission {
  const trimmed = code.trim();
  const separatorIndex = trimmed.indexOf(".");
  if (separatorIndex === -1 || trimmed.slice(0, separatorIndex) !== CODE_PREFIX) {
    throw new Error("올바른 형식의 코드가 아닙니다. 고객에게 받은 코드 전체를 붙여넣었는지 확인해주세요.");
  }
  const payload = trimmed.slice(separatorIndex + 1);
  try {
    const parsed = JSON.parse(base64UrlToUtf8(payload));
    if (!parsed?.birthInput || !parsed?.board) throw new Error("필수 정보가 누락되었습니다");
    return parsed as IntakeSubmission;
  } catch {
    throw new Error("코드를 해석할 수 없습니다. 고객에게 받은 코드 전체를 정확히 붙여넣었는지 확인해주세요.");
  }
}
