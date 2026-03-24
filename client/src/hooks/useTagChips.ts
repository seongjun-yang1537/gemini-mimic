import { useMemo, useState } from 'react';
import type { AttachedFile } from '../types/attachment';
import { createTagChipElement, getEditorSelectionRange, getTextBeforeCaret } from '../utils/editorHelpers';

interface AutocompleteState {
  isOpen: boolean;
  queryText: string;
  selectedIndex: number;
}

export function useTagChips(attachmentItems: AttachedFile[]) {
  const [autocompleteState, setAutocompleteState] = useState<AutocompleteState>({
    isOpen: false,
    queryText: '',
    selectedIndex: 0
  });

  const candidates = useMemo(() => {
    const normalizedQuery = autocompleteState.queryText.trim().toLowerCase();
    if (!normalizedQuery) {
      return attachmentItems;
    }
    return attachmentItems.filter((attachmentItem) => {
      return attachmentItem.tag.toLowerCase().includes(normalizedQuery) || attachmentItem.file.name.toLowerCase().includes(normalizedQuery);
    });
  }, [attachmentItems, autocompleteState.queryText]);

  const refreshAutocomplete = (editorElement: HTMLDivElement | null) => {
    const prefixText = getTextBeforeCaret(editorElement);
    const matchedQuery = prefixText.match(/(^|\s)@([^\s@]*)$/);
    if (!matchedQuery) {
      setAutocompleteState({ isOpen: false, queryText: '', selectedIndex: 0 });
      return;
    }

    setAutocompleteState((currentState) => ({
      isOpen: true,
      queryText: matchedQuery[2],
      selectedIndex: currentState.selectedIndex
    }));
  };

  const closeAutocomplete = () => {
    setAutocompleteState({ isOpen: false, queryText: '', selectedIndex: 0 });
  };

  const moveSelection = (direction: 'up' | 'down') => {
    setAutocompleteState((currentState) => {
      if (!candidates.length) {
        return currentState;
      }
      const nextIndex = direction === 'down'
        ? (currentState.selectedIndex + 1) % candidates.length
        : (currentState.selectedIndex - 1 + candidates.length) % candidates.length;
      return { ...currentState, selectedIndex: nextIndex };
    });
  };

  const insertChip = (editorElement: HTMLDivElement | null, selectedAttachment: AttachedFile) => {
    const selectedRange = getEditorSelectionRange(editorElement);
    const prefixText = getTextBeforeCaret(editorElement);
    if (!selectedRange || !editorElement) {
      return;
    }

    const matchedQuery = prefixText.match(/(^|\s)@([^\s@]*)$/);
    if (matchedQuery) {
      const queryLength = matchedQuery[0].length;
      selectedRange.setStart(selectedRange.endContainer, Math.max(0, selectedRange.endOffset - queryLength + 1));
      selectedRange.deleteContents();
    }

    const chipElement = createTagChipElement(selectedAttachment.tag);
    const spacingTextNode = document.createTextNode(' ');
    selectedRange.insertNode(spacingTextNode);
    selectedRange.insertNode(chipElement);

    const nextRange = document.createRange();
    nextRange.setStartAfter(spacingTextNode);
    nextRange.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(nextRange);

    closeAutocomplete();
  };

  return {
    autocompleteState,
    candidates,
    refreshAutocomplete,
    closeAutocomplete,
    moveSelection,
    insertChip
  };
}
