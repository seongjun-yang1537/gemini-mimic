import type { ExpertDotColor } from '../../types/task';

interface ExpertDotsProps {
  expertDots?: ExpertDotColor[];
}

export default function ExpertDots({ expertDots = [] }: ExpertDotsProps) {
  if (!expertDots.length) {
    return null;
  }

  return (
    <span className="expert-dots" aria-label="활성 전문가">
      {expertDots.map((dotColor, dotIndex) => (
        <span key={`${dotColor}-${dotIndex}`} className={`expert-dot expert-${dotColor}`} />
      ))}
    </span>
  );
}
