import { useNavigate } from 'react-router-dom';
import ExpertDots from './ExpertDots';
import PhaseRing from './PhaseRing';
import PhaseTrack from './PhaseTrack';
import StatusBadge from './StatusBadge';
import { formatTokenCount, formatUsdCost } from '../../utils/format';
export default function TaskRow({ taskItem, dataMode }) {
    const navigate = useNavigate();
    const handleNavigateToRunDetail = () => {
        const routePrefix = dataMode === 'debug' ? '/debug' : '';
        navigate(`${routePrefix}/run/${taskItem.id}`);
    };
    const handleTaskRowKeyDown = (keyboardEvent) => {
        if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
            keyboardEvent.preventDefault();
            handleNavigateToRunDetail();
        }
    };
    return (<div className="task-row" onClick={handleNavigateToRunDetail} onKeyDown={handleTaskRowKeyDown} role="link" tabIndex={0}>
      <PhaseRing phase={taskItem.currentPhase} status={taskItem.status}/>
      <div className="task-main">
        <div className="task-title-line">
          <span className="task-title">{taskItem.title}</span>
          <ExpertDots expertDots={taskItem.expertDots}/>
        </div>
        <span className="task-meta">{taskItem.createdAt} · {taskItem.statusLabel}</span>
      </div>
      <PhaseTrack phaseStatuses={taskItem.phaseStatuses}/>
      <div className="cost-column">
        <div className="cost-usd">{formatUsdCost(taskItem.costUsd)}</div>
        <div className="cost-token">{formatTokenCount(taskItem.tokenCount)}</div>
        <StatusBadge status={taskItem.status}/>
      </div>
    </div>);
}
