import { useMemo, useState } from 'react';
import type { AttachedFile } from '../types/attachment';

interface AutocompleteState {
  isOpen: boolean;
  queryText: string;
  selectedIndex: number;
}

function getSelectionRangeFromEditor(editorElement: HTMLDivElement | null): Range | null {
  if (!editorElement) {
    return null;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const selectedRange = selection.getRangeAt(0);
  if (!editorElement.contains(selectedRange.startContainer) || !editorElement.contains(selectedRange.endContainer)) {
    return null;
  }

  return selectedRange;
}

function extractQueryFromCaret(editorElement: HTMLDivElement | null): string {
  const selectionRange = getSelectionRangeFromEditor(editorElement);
  if (!selectionRange || !editorElement) {
    return '';
  }

  const prefixRange = selectionRange.cloneRange();
  prefixRange.selectNodeContents(editorElement);
  prefixRange.setEnd(selectionRange.endContainer, selectionRange.endOffset);
  const prefixText = prefixRange.toString().replace(/\u00a0/g, ' ');
  const matchedQuery = prefixText.match(/(^|\s)@([^\s@]*)$/);

  return matchedQuery ? matchedQuery[2] : '';
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
    const queryText = extractQueryFromCaret(editorElement);
    if (!queryText && !getSelectionRangeFromEditor(editorElement)?.toString().includes('@')) {
      setAutocompleteState({ isOpen: false, queryText: '', selectedIndex: 0 });
      return;
    }

    setAutocompleteState((currentState) => ({
      isOpen: true,
      queryText,
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
    const selectedRange = getSelectionRangeFromEditor(editorElement);
    if (!selectedRange || !editorElement) {
      return;
    }

    const prefixRange = selectedRange.cloneRange();
    prefixRange.selectNodeContents(editorElement);
    prefixRange.setEnd(selectedRange.endContainer, selectedRange.endOffset);
    const prefixText = prefixRange.toString().replace(/\u00a0/g, ' ');
    const matchedQuery = prefixText.match(/(^|\s)@([^\s@]*)$/);

    if (matchedQuery) {
      const queryLength = matchedQuery[0].length;
      selectedRange.setStart(selectedRange.endContainer, Math.max(0, selectedRange.endOffset - queryLength + 1));
      selectedRange.deleteContents();
    }

    const chipElement = document.createElement('span');
    chipElement.className = 'tag-chip';
    chipElement.dataset.tag = selectedAttachment.tag;
    chipElement.contentEditable = 'false';
    chipElement.textContent = selectedAttachment.tag;

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
