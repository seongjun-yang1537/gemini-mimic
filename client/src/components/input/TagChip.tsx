interface TagChipProps {
  value: string;
}

export default function TagChip({ value }: TagChipProps) {
  return <span className="tag-chip" contentEditable={false} data-tag={value}>{value}</span>;
}
