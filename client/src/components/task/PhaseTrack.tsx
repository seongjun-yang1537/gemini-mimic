import type { PhaseInfo } from '../../types/task';

interface PhaseTrackProps {
  phaseStatuses: PhaseInfo[];
}

function getPhaseText(phaseInfo: PhaseInfo): string {
  if (phaseInfo.status === 'completed') {
    return '✓';
  }

  return String(phaseInfo.phase);
}

export default function PhaseTrack({ phaseStatuses }: PhaseTrackProps) {
  return (
    <div className="phase-track" aria-label="phase 진행">
      {phaseStatuses.map((phaseInfo, phaseIndex) => {
        const stepClassName = phaseInfo.status;
        const isLinkCompleted = phaseInfo.status === 'completed';

        return (
          <div key={phaseInfo.phase} className="phase-track-segment">
            <span className={`phase-step ${stepClassName}`.trim()}>{getPhaseText(phaseInfo)}</span>
            {phaseIndex < phaseStatuses.length - 1 ? <span className={`phase-link ${isLinkCompleted ? 'completed' : ''}`.trim()} /> : null}
          </div>
        );
      })}
    </div>
  );
}
