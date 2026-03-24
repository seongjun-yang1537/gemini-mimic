import { PHASE_LABELS } from '../../constants/phases';
import type { Task } from '../../types/task';

interface PhaseTrackProps {
  taskItem: Task;
}

export default function PhaseTrack({ taskItem }: PhaseTrackProps) {
  return (
    <div className="phase-track" aria-label="phase 진행">
      {PHASE_LABELS.map((phaseLabel, phaseIndex) => {
        const phaseNumber = phaseIndex + 1;
        const isCompleted = taskItem.status === 'completed' || phaseNumber < taskItem.phase;
        const isCurrentRunning = taskItem.status === 'running' && phaseNumber === taskItem.phase;
        const isFailed = taskItem.status === 'failed' && phaseNumber === taskItem.phase;
        const stepClassName = isFailed ? 'failed' : isCurrentRunning ? 'current' : isCompleted ? 'completed' : '';
        const textValue = isCompleted ? '✓' : phaseLabel;

        return (
          <div key={phaseLabel} className="phase-track-segment">
            <span className={`phase-step ${stepClassName}`.trim()}>{textValue}</span>
            {phaseNumber < 4 ? <span className={`phase-link ${isCompleted ? 'completed' : ''}`.trim()} /> : null}
          </div>
        );
      })}
    </div>
  );
}
