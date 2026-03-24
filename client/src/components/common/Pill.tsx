import type { ReactNode } from 'react';

interface PillProps {
  children: ReactNode;
  className?: string;
}

export default function Pill({ children, className }: PillProps) {
  return <span className={`status-badge ${className || ''}`.trim()}>{children}</span>;
}
