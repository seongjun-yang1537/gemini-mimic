export function getEditorSelectionRange(editorElement) {
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
export function getTextBeforeCaret(editorElement) {
    const selectionRange = getEditorSelectionRange(editorElement);
    if (!selectionRange || !editorElement) {
        return '';
    }
    const prefixRange = selectionRange.cloneRange();
    prefixRange.selectNodeContents(editorElement);
    prefixRange.setEnd(selectionRange.endContainer, selectionRange.endOffset);
    return prefixRange.toString().replace(/\u00a0/g, ' ');
}
export function createTagChipElement(tagText) {
    const chipElement = document.createElement('span');
    chipElement.className = 'tag-chip';
    chipElement.dataset.tag = tagText;
    chipElement.contentEditable = 'false';
    chipElement.textContent = tagText;
    return chipElement;
}
