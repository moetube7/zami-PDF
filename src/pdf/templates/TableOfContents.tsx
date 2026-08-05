interface Props {
  chapters: { id: string; title: string }[];
}

// 참고: Chromium의 PDF 인쇄 엔진은 target-counter() 같은 페이지드 미디어 기능을
// 신뢰성 있게 지원하지 않아, 정확한 쪽번호가 붙은 목차는 현재 범위 밖입니다.
// 우선 챕터 순서를 보여주는 목차만 제공합니다.
export default function TableOfContents({ chapters }: Props) {
  return (
    <section className="toc-page">
      <h2 className="toc-heading">목차</h2>
      <ol className="toc-list">
        {chapters.map((c) => (
          <li key={c.id} className="toc-item">
            {c.title}
          </li>
        ))}
      </ol>
    </section>
  );
}
