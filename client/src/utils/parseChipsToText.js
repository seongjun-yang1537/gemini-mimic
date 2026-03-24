export function parseChipsToText(editorElement) {
    if (!editorElement) {
        return '';
    }
    const textParts = [];
    editorElement.childNodes.forEach((childNode) => {
        if (childNode.nodeType === Node.TEXT_NODE) {
            textParts.push((childNode.textContent || '').replace(/\u00a0/g, ' '));
            return;
        }
        if (childNode.nodeType === Node.ELEMENT_NODE) {
            const chipElement = childNode;
            if (chipElement.dataset.tag) {
                textParts.push(chipElement.dataset.tag);
            }
            else {
                textParts.push((chipElement.textContent || '').replace(/\u00a0/g, ' '));
            }
        }
    });
    return textParts.join('').replace(/\s+/g, ' ').trim();
}
