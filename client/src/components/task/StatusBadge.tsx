import Pill from '../common/Pill';
import type { TaskStatus } from '../../types/task';

interface StatusBadgeProps {
  status: TaskStatus;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  running: 'running',
  completed: 'completed',
  failed: 'failed'
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return <Pill className={`status-${status}`}>{STATUS_LABELS[status]}</Pill>;
}
