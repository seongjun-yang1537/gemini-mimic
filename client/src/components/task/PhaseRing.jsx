function computeProgress(phase, status) {
    if (status === 'completed') {
        return 1;
    }
    if (status === 'failed' || status === 'running') {
        return Math.max(0, Math.min(1, phase / 4));
    }
    return Math.max(0, Math.min(1, (phase - 1) / 4));
}
export default function PhaseRing({ phase, status }) {
    const normalizedProgress = computeProgress(phase, status);
    const radius = 14;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - normalizedProgress);
    const centerIcon = status === 'completed' ? '✓' : status === 'failed' ? '!' : String(phase);
    return (<div className="phase-ring" data-status={status}>
      <svg viewBox="0 0 34 34" aria-hidden="true">
        <circle className="track" cx="17" cy="17" r={radius}/>
        <circle className="progress" cx="17" cy="17" r={radius} strokeDasharray={circumference} strokeDashoffset={dashOffset}/>
      </svg>
      <span className="icon">{centerIcon}</span>
      <span className="orbit-wrap" aria-hidden="true">
        <span className="orbit-dot"/>
      </span>
    </div>);
}
