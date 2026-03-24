import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import RunArtifacts from '../components/run/RunArtifacts';
import RunCost from '../components/run/RunCost';
import RunPhases from '../components/run/RunPhases';
import RunSummary from '../components/run/RunSummary';
import RunTabBar from '../components/run/RunTabBar';
import RunTabContent from '../components/run/RunTabContent';
import RunTopBar from '../components/run/RunTopBar';
import { useRunDetail } from '../hooks/useRunDetail';
import { useRunDetailMock } from '../hooks/useRunDetailMock';
const TAB_LABEL_MAP = {
    debate: '토론 로그',
    scenario: '시나리오',
    artifacts: '생성물',
    logs: '로그'
};
export default function RunDetailPage({ dataMode }) {
    const navigate = useNavigate();
    const { id: runId } = useParams();
    const backPath = dataMode === 'debug' ? '/debug' : '/';
    const productionRunDetailState = useRunDetail(runId);
    const debugRunDetailState = useRunDetailMock(runId);
    const selectedRunState = dataMode === 'debug' ? debugRunDetailState : productionRunDetailState;
    const { runDetail, elapsedSeconds } = selectedRunState;
    const [selectedTab, setSelectedTab] = useState('debate');
    const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);
    const summaryText = useMemo(() => {
        if (!runDetail) {
            return '작업 정보를 찾을 수 없습니다';
        }
        return runDetail.summary;
    }, [runDetail]);
    if (!runDetail) {
        return (<main className="run-detail-empty-wrap">
        <button type="button" className="summary-toggle-button" onClick={() => navigate(backPath)}>
          뒤로 가기
        </button>
        <p className="run-tab-empty">
          {runId ? `작업 ${runId} 정보를 찾을 수 없습니다` : '작업 정보를 찾을 수 없습니다'}
        </p>
      </main>);
    }
    return (<div className="run-detail-page">
      <RunTopBar title={runDetail.title} status={runDetail.status} elapsedSeconds={elapsedSeconds} errorMessage={runDetail.errorMessage} onBack={() => navigate(backPath)} onCancel={() => undefined} onRetry={() => undefined}/>

      <div className="run-detail-layout">
        <button type="button" className="summary-toggle-button" onClick={() => setIsMobileSummaryOpen((currentValue) => !currentValue)}>
          {isMobileSummaryOpen ? '요약 숨기기' : '요약 보기'}
        </button>

        <aside className={isMobileSummaryOpen ? 'left-panel open' : 'left-panel'}>
          <RunSummary summaryText={summaryText}/>
          <RunPhases phases={runDetail.phases}/>
          <RunCost costInfo={runDetail.cost}/>
          <RunArtifacts artifactItems={runDetail.artifacts}/>
        </aside>

        <section className="right-panel">
          <RunTabBar selectedTab={selectedTab} onSelectTab={setSelectedTab}/>
          <RunTabContent tabLabel={TAB_LABEL_MAP[selectedTab]}/>
        </section>
      </div>
    </div>);
}
