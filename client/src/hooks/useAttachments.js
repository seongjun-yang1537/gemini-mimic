import { useMemo, useState } from 'react';
import { FALLBACK_ICON } from '../utils/fallbackIcons';
import { createThumbnail } from '../utils/thumbnail';
function detectAttachmentType(fileObject) {
    if (fileObject.type.startsWith('video/')) {
        return 'video';
    }
    return 'image';
}
function reindexAttachments(existingAttachments) {
    let imageIndex = 0;
    let videoIndex = 0;
    return existingAttachments.map((attachmentItem) => {
        if (attachmentItem.type === 'video') {
            videoIndex += 1;
            return { ...attachmentItem, index: videoIndex, tag: `@영상${videoIndex}` };
        }
        imageIndex += 1;
        return { ...attachmentItem, index: imageIndex, tag: `@이미지${imageIndex}` };
    });
}
export function useAttachments() {
    const [attachmentItems, setAttachmentItems] = useState([]);
    const [nextAttachmentId, setNextAttachmentId] = useState(1);
    const attachmentTagList = useMemo(() => attachmentItems.map((attachmentItem) => attachmentItem.tag), [attachmentItems]);
    const addFiles = async (selectedFiles) => {
        if (!selectedFiles || selectedFiles.length === 0) {
            return;
        }
        const fileArray = Array.from(selectedFiles);
        const builtAttachments = await Promise.all(fileArray.map(async (selectedFile, fileOffset) => {
            const attachmentType = detectAttachmentType(selectedFile);
            const thumbnailUrl = await createThumbnail(selectedFile, attachmentType);
            return {
                id: nextAttachmentId + fileOffset,
                file: selectedFile,
                type: attachmentType,
                index: 0,
                tag: '',
                thumbnailUrl
            };
        }));
        setNextAttachmentId((currentNextAttachmentId) => currentNextAttachmentId + builtAttachments.length);
        setAttachmentItems((currentAttachmentItems) => reindexAttachments([...currentAttachmentItems, ...builtAttachments]));
    };
    const removeAttachmentById = (attachmentId) => {
        setAttachmentItems((currentAttachmentItems) => {
            const matchedAttachment = currentAttachmentItems.find((attachmentItem) => attachmentItem.id === attachmentId);
            if (matchedAttachment && matchedAttachment.thumbnailUrl.startsWith('blob:')) {
                URL.revokeObjectURL(matchedAttachment.thumbnailUrl);
            }
            return reindexAttachments(currentAttachmentItems.filter((attachmentItem) => attachmentItem.id !== attachmentId));
        });
    };
    return { attachmentItems, attachmentTagList, addFiles, removeAttachmentById, fallbackIcon: FALLBACK_ICON };
}
