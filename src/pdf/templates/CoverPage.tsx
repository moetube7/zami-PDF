interface Props {
  title: string;
  subtitle?: string;
  generatedAt: string;
}

export default function CoverPage({ title, subtitle, generatedAt }: Props) {
  return (
    <section className="cover-page">
      <p className="cover-eyebrow">紫微斗數</p>
      <h1 className="cover-title">{title}</h1>
      {subtitle && <p className="cover-subtitle">{subtitle}</p>}
      <p className="cover-date">{generatedAt}</p>
    </section>
  );
}
