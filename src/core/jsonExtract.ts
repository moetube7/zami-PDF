// LLM이 JSON 블록 안에 이스케이프되지 않은 줄바꿈/탭을 그대로 넣는 경우가 있어
// (특히 챕터 본문처럼 긴 문자열 필드일 때 빈도가 높아짐), 순수 JSON.parse보다
// 관용적으로 파싱한다. 문자열 리터럴 내부의 제어 문자만 이스케이프해서 되돌린다.
function sanitizeJsonControlChars(raw: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      result += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }
    if (inString && (ch === "\n" || ch === "\r" || ch === "\t")) {
      result += ch === "\n" ? "\\n" : ch === "\r" ? "\\r" : "\\t";
      continue;
    }
    result += ch;
  }

  return result;
}

// 텍스트에서 첫 "{"부터 마지막 "}"까지를 잘라 JSON으로 파싱한다.
export function extractJsonObject(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("JSON 블록 없음");
  const raw = text.slice(start, end + 1);

  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(sanitizeJsonControlChars(raw));
  }
}
