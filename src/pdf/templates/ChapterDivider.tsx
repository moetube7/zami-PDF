import type { ReportChapter } from "@/core/types";

interface Props {
  chapter: ReportChapter;
}

export default function ChapterDivider({ chapter }: Props) {
  return (
    <section className="chapter-divider">
      <h2 className="chapter-divider-title">{chapter.title}</h2>
    </section>
  );
}
