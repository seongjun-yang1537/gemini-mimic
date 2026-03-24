import StatusBadge from '../task/StatusBadge';
import type { RunDetailStatus } from '../../types/runDetail';

interface RunTopBarProps {
  title: string;
  status: RunDetailStatus;
  elapsedSeconds: number;
  errorMessage?: string;
  onBack: () => void;
  onCancel: () => void;
  onRetry: () => void;
}

function formatElapsedSeconds(elapsedSeconds: number): string {
  const safeSeconds = Math.max(0, elapsedSeconds);
  const minuteValue = Math.floor(safeSeconds / 60);
  const secondValue = safeSeconds % 60;
  return `${minuteValue}분 ${secondValue}초`;
}

export default function RunTopBar({ title, status, elapsedSeconds, errorMessage, onBack, onCancel, onRetry }: RunTopBarProps) {
  const showCancelButton = status === 'running';
  const showRetryButton = status === 'completed' || status === 'failed' || status === 'cancelled';

  return (
    <header className="run-top-bar">
      <button type="button" className="icon-button" onClick={onBack} aria-label="대시보드로 이동">
        <span className="arrow-left" />
      </button>
      <div className="run-title-wrap">
        <span className="run-title">{title}</span>
        <StatusBadge status={status} />
        {status === 'failed' && errorMessage ? <span className="run-error-inline">실패 원인: {errorMessage}</span> : null}
      </div>
      <span className="run-elapsed">{formatElapsedSeconds(elapsedSeconds)}</span>
      <div className="run-actions">
        {showCancelButton ? (
          <button type="button" className="outline-button" onClick={onCancel}>
            취소
          </button>
        ) : null}
        {showRetryButton ? (
          <button type="button" className="outline-button" onClick={onRetry}>
            재실행
          </button>
        ) : null}
      </div>
    </header>
  );
}
