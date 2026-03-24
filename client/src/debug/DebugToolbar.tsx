import type { TaskStatus } from '../types/task';

interface DebugToolbarProps {
  onAddTask: (status: TaskStatus) => void;
  onResetTasks: () => void;
}

export default function DebugToolbar({ onAddTask, onResetTasks }: DebugToolbarProps) {
  return (
    <section className="debug-toolbar" aria-label="디버그 툴바">
      <p className="debug-toolbar-title">Debug mode</p>
      <div className="debug-toolbar-actions">
        <button type="button" className="debug-toolbar-button" onClick={() => onAddTask('running')}>+ 진행 중 추가</button>
        <button type="button" className="debug-toolbar-button" onClick={() => onAddTask('completed')}>+ 완료 추가</button>
        <button type="button" className="debug-toolbar-button" onClick={() => onAddTask('failed')}>+ 실패 추가</button>
        <button type="button" className="debug-toolbar-button" onClick={onResetTasks}>전체 초기화</button>
      </div>
    </section>
  );
}
