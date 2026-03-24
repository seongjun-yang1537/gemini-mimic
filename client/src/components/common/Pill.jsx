export default function Pill({ children, className }) {
    return <span className={`status-badge ${className || ''}`.trim()}>{children}</span>;
}
