interface RunTabContentProps {
  tabLabel: string;
}

export default function RunTabContent({ tabLabel }: RunTabContentProps) {
  return (
    <section className="run-tab-content" aria-label={`${tabLabel} 콘텐츠`}>
      <p className="run-tab-empty">이 탭의 내용은 파이프라인 실행 후 표시됩니다</p>
    </section>
  );
}
