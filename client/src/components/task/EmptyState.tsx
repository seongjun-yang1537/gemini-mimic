interface EmptyStateProps {
  title: string;
}

export default function EmptyState({ title }: EmptyStateProps) {
  return <div className="empty-state">{title}</div>;
}
