import type { Task } from '../../types/task';
import TaskRow from './TaskRow';

interface TaskListProps {
  taskItems: Task[];
}

export default function TaskList({ taskItems }: TaskListProps) {
  return (
    <div className="task-list">
      {taskItems.map((taskItem) => (
        <TaskRow key={taskItem.id} taskItem={taskItem} />
      ))}
    </div>
  );
}
