interface BadgeProps {
  count: number;
  isActive: boolean;
}

export default function Badge({ count, isActive }: BadgeProps) {
  return <span className={`count-badge${isActive ? ' active-count' : ''}`}>{count}</span>;
}
