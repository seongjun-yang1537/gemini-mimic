export default function Badge({ count, isActive }) {
    return <span className={`count-badge${isActive ? ' active-count' : ''}`}>{count}</span>;
}
