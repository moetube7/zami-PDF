import type { ReportChapter } from "@/core/types";

interface Props {
  chapter: ReportChapter;
}

// 프롬프트가 "**단어**" 형식의 강조를 지시하므로, 실제 <strong> 태그로 변환해 렌더링한다.
function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((p) => p.length > 0);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default function ChapterBody({ chapter }: Props) {
  const paragraphs = chapter.bodyMarkdown
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return (
    <section className="chapter-body">
      <h3 className="chapter-body-title">{chapter.title}</h3>
      {paragraphs.map((p, i) => (
        <p key={i}>{renderInlineMarkdown(p)}</p>
      ))}
    </section>
  );
}
