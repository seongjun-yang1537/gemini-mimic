export default function TagChip({ value }) {
    return <span className="tag-chip" contentEditable={false} data-tag={value}>{value}</span>;
}
