import TaskRow from './TaskRow';
export default function TaskList({ taskItems, dataMode }) {
    return (<div className="task-list">
      {taskItems.map((taskItem) => (<TaskRow key={taskItem.id} taskItem={taskItem} dataMode={dataMode}/>))}
    </div>);
}
