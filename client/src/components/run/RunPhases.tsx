import type { PhaseDetail } from '../../types/runDetail';

interface RunPhasesProps {
  phases: PhaseDetail[];
}

function getPhaseMarkerClassName(status: PhaseDetail['status']): string {
  if (status === 'completed') {
    return 'phase-marker completed';
  }

  if (status === 'running') {
    return 'phase-marker running';
  }

  if (status === 'failed') {
    return 'phase-marker failed';
  }

  return 'phase-marker pending';
}

function getPhaseSubText(phaseItem: PhaseDetail): string {
  if (phaseItem.status === 'pending') {
    return '대기';
  }

  const minuteValue = Math.floor(phaseItem.elapsedSeconds / 60);
  const secondValue = phaseItem.elapsedSeconds % 60;

  if (phaseItem.status === 'completed') {
    return `${minuteValue}분 ${secondValue}초 · 완료`;
  }

  if (phaseItem.status === 'running') {
    return `${minuteValue}분 ${secondValue}초 · 진행 중`;
  }

  return `${minuteValue}분 ${secondValue}초 · 실패`;
}

export default function RunPhases({ phases }: RunPhasesProps) {
  return (
    <section className="run-section">
      <h2 className="section-title">진행 상황</h2>
      <ol className="run-phase-list">
        {phases.map((phaseItem, indexValue) => {
          const nextPhase = phases[indexValue + 1];
          const connectorClassName = phaseItem.status === 'completed' && nextPhase ? 'phase-connector completed' : 'phase-connector';

          return (
            <li key={phaseItem.phase} className="run-phase-item">
              <div className="run-phase-marker-column">
                <span className={getPhaseMarkerClassName(phaseItem.status)} aria-hidden="true" />
                {nextPhase ? <span className={connectorClassName} aria-hidden="true" /> : null}
              </div>
              <div className="run-phase-content">
                <div className="run-phase-name">Phase {phaseItem.phase} — {phaseItem.name}</div>
                <div className="run-phase-meta">{getPhaseSubText(phaseItem)}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
