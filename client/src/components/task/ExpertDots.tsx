import { EXPERTS } from '../../constants/experts';
import type { ExpertKey } from '../../types/expert';

interface ExpertDotsProps {
  activeExperts: ExpertKey[];
}

export default function ExpertDots({ activeExperts }: ExpertDotsProps) {
  if (!activeExperts.length) {
    return null;
  }

  return (
    <span className="expert-dots" aria-label="활성 전문가">
      {activeExperts.map((expertKey) => {
        const matchedExpert = EXPERTS.find((expertDescriptor) => expertDescriptor.key === expertKey);
        if (!matchedExpert) {
          return null;
        }
        return <span key={expertKey} className={`expert-dot ${matchedExpert.dotClassName}`} title={matchedExpert.label} />;
      })}
    </span>
  );
}
