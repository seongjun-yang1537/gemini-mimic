import { Link } from 'react-router-dom';
import type { Task } from '../../types/task';
import ExpertDots from './ExpertDots';
import PhaseRing from './PhaseRing';
import PhaseTrack from './PhaseTrack';
import StatusBadge from './StatusBadge';

interface TaskRowProps {
  taskItem: Task;
  dataMode: 'production' | 'debug';
}

function formatTokenCount(tokenCount: number): string {
  return `${new Intl.NumberFormat('ko-KR').format(Math.round(tokenCount))} tok`;
}

function formatUsdCost(costValue: number): string {
  return `$${costValue.toFixed(2)}`;
}

export default function TaskRow({ taskItem, dataMode }: TaskRowProps) {
  const routePrefix = dataMode === 'debug' ? '/debug' : '';
  const runDetailPath = `${routePrefix}/run/${taskItem.id}`;

  return (
    <Link className="task-row" to={runDetailPath}>
      <PhaseRing phase={taskItem.currentPhase} status={taskItem.status} />
      <div className="task-main">
        <div className="task-title-line">
          <span className="task-title">{taskItem.title}</span>
          <ExpertDots expertDots={taskItem.expertDots} />
        </div>
        <span className="task-meta">{taskItem.createdAt} · {taskItem.statusLabel}</span>
      </div>
      <PhaseTrack phaseStatuses={taskItem.phaseStatuses} />
      <div className="cost-column">
        <div className="cost-usd">{formatUsdCost(taskItem.costUsd)}</div>
        <div className="cost-token">{formatTokenCount(taskItem.tokenCount)}</div>
        <StatusBadge status={taskItem.status} />
      </div>
    </Link>
  );
}
