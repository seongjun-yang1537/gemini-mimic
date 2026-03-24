import Pill from '../common/Pill';
import type { TaskStatus } from '../../types/task';

interface StatusBadgeProps {
  status: TaskStatus;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: '대기',
  running: '진행 중',
  completed: '완료',
  failed: '실패',
  cancelled: '취소됨'
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return <Pill className={`status-${status}`}>{STATUS_LABELS[status]}</Pill>;
}
