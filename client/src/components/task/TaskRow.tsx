import type { Task } from '../../types/task';
import ExpertDots from './ExpertDots';
import PhaseRing from './PhaseRing';
import PhaseTrack from './PhaseTrack';
import StatusBadge from './StatusBadge';

interface TaskRowProps {
  taskItem: Task;
}

function formatTokenCount(tokenCount: number): string {
  return `${new Intl.NumberFormat('ko-KR').format(Math.round(tokenCount))} tok`;
}

function formatUsdCost(costValue: number): string {
  return `$${costValue.toFixed(2)}`;
}

export default function TaskRow({ taskItem }: TaskRowProps) {
  return (
    <button type="button" className="task-row">
      <PhaseRing phase={taskItem.phase} status={taskItem.status} />
      <div className="task-main">
        <div className="task-title-line">
          <span className="task-title">{taskItem.title}</span>
          <ExpertDots activeExperts={taskItem.activeExperts} />
        </div>
        <span className="task-meta">{taskItem.createdAt} · {taskItem.phaseDetail}</span>
      </div>
      <StatusBadge status={taskItem.status} />
      <PhaseTrack taskItem={taskItem} />
      <div className="cost-column">
        <div className="cost-usd">{formatUsdCost(taskItem.cost)}</div>
        <div className="cost-token">{formatTokenCount(taskItem.tokens)}</div>
      </div>
    </button>
  );
}
