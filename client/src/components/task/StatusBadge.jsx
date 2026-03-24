const STATUS_LABELS = {
    pending: '대기',
    running: '진행 중',
    completed: '완료',
    failed: '실패',
    cancelled: '취소됨'
};
export default function StatusBadge({ status }) {
    return <span className="status-badge" data-status={status}>{STATUS_LABELS[status]}</span>;
}
