import { useState } from 'react';
import type { ArtifactInfo } from '../../types/runDetail';

interface RunArtifactsProps {
  artifactItems: ArtifactInfo[];
}

function ArtifactTypeIcon({ type }: { type: ArtifactInfo['type'] }) {
  if (type === 'document') {
    return <span className="artifact-icon document" aria-hidden="true" />;
  }

  if (type === 'image') {
    return <span className="artifact-icon image" aria-hidden="true" />;
  }

  if (type === 'video') {
    return <span className="artifact-icon video" aria-hidden="true" />;
  }

  return <span className="artifact-icon audio" aria-hidden="true" />;
}

export default function RunArtifacts({ artifactItems }: RunArtifactsProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  return (
    <section className="run-section">
      <button type="button" className="run-section-toggle" onClick={() => setIsExpanded((currentValue) => !currentValue)}>
        <span>생성물 ({artifactItems.length}개)</span>
        <span className={isExpanded ? 'chevron-down open' : 'chevron-down'} aria-hidden="true" />
      </button>
      {isExpanded ? (
        artifactItems.length > 0 ? (
          <ul className="artifact-list">
            {artifactItems.map((artifactItem) => (
              <li key={artifactItem.name}>
                <button type="button" className="artifact-row">
                  <ArtifactTypeIcon type={artifactItem.type} />
                  <span className="artifact-name">{artifactItem.name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="run-placeholder">아직 생성물이 없습니다</p>
        )
      ) : null}
    </section>
  );
}
