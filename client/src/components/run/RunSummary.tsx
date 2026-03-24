interface RunSummaryProps {
  summaryText: string;
}

export default function RunSummary({ summaryText }: RunSummaryProps) {
  return (
    <section className="run-section">
      <h2 className="section-title">Summary</h2>
      <p className="run-summary-text">{summaryText}</p>
    </section>
  );
}
