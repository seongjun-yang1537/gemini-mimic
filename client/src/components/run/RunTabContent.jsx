function renderLogList(logItems) {
    if (!logItems?.length) {
        return <p className="run-tab-empty">로그가 없습니다.</p>;
    }

    return (
        <ul className="run-log-list">
          {logItems.map((logItem, logIndex) => (
              <li key={`${logItem}-${logIndex}`} className="run-log-item">{logItem}</li>
          ))}
        </ul>
    );
}

export default function RunTabContent({ selectedTab, runDetail }) {
    if (selectedTab === 'debate' || selectedTab === 'scenario') {
        return (
            <section className="run-tab-content run-tab-content-text" aria-label="phase 1 감상 콘텐츠">
              <div className="run-phase1-card">
                <p className="run-phase1-eyebrow">Phase 1</p>
                <p className="run-phase1-text">{runDetail.phase1?.impression || runDetail.summary || '이 탭의 내용은 파이프라인 실행 후 표시됩니다'}</p>
              </div>
            </section>
        );
    }

    if (selectedTab === 'logs') {
        return (
            <section className="run-tab-content run-tab-content-text" aria-label="에러 로그 콘텐츠">
              {runDetail.errorMessage ? (
                  <div className="run-error-card">
                    <p className="run-error-card-label">실패 원인</p>
                    <p className="run-error-card-text">{runDetail.errorMessage}</p>
                  </div>
              ) : null}
              {renderLogList(runDetail.logs)}
            </section>
        );
    }

    return (
        <section className="run-tab-content" aria-label="생성물 콘텐츠">
          <p className="run-tab-empty">이 탭의 내용은 파이프라인 실행 후 표시됩니다</p>
        </section>
    );
}
