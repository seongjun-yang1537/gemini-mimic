import type { Task } from '../../types/task';
import TaskRow from './TaskRow';

interface TaskListProps {
  taskItems: Task[];
  dataMode: 'production' | 'debug';
}

export default function TaskList({ taskItems, dataMode }: TaskListProps) {
  return (
    <div className="task-list">
      {taskItems.map((taskItem) => (
        <TaskRow key={taskItem.id} taskItem={taskItem} dataMode={dataMode} />
      ))}
    </div>
  );
}
