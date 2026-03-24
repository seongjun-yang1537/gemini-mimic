import type { AttachedFile } from '../../types/attachment';

interface TagAutocompleteProps {
  isVisible: boolean;
  candidates: AttachedFile[];
  selectedIndex: number;
  onSelectCandidate: (candidate: AttachedFile) => void;
}

export default function TagAutocomplete({ isVisible, candidates, selectedIndex, onSelectCandidate }: TagAutocompleteProps) {
  if (!isVisible || !candidates.length) {
    return <div className="tag-autocomplete" />;
  }

  return (
    <div className="tag-autocomplete visible">
      {candidates.map((candidateItem, candidateIndex) => (
        <button
          key={candidateItem.id}
          type="button"
          className={`tag-autocomplete-item${selectedIndex === candidateIndex ? ' active' : ''}`}
          onMouseDown={(event) => {
            event.preventDefault();
            onSelectCandidate(candidateItem);
          }}
        >
          <span className="autocomplete-thumb">
            <img src={candidateItem.thumbnailUrl} alt={candidateItem.file.name} />
          </span>
          <span className="autocomplete-tag">{candidateItem.tag}</span>
          <span className="autocomplete-name">{candidateItem.file.name}</span>
        </button>
      ))}
    </div>
  );
}
