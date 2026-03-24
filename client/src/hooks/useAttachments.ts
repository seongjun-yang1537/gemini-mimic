import { useMemo, useState } from 'react';
import type { AttachedFile, AttachmentType } from '../types/attachment';

const FALLBACK_ICON = {
  image: "data:image/svg+xml;charset=UTF-8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 22 22'><path d='M6.5 5h9A1.5 1.5 0 0 1 17 6.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 5 15.5v-9A1.5 1.5 0 0 1 6.5 5Zm.7 8.8h7.6l-1.9-2.4a.9.9 0 0 0-1.4 0l-1.3 1.7-.8-.9a.9.9 0 0 0-1.4.1l-.8 1.1Zm6.6-5.9a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z' fill='currentColor'/></svg>",
  video: "data:image/svg+xml;charset=UTF-8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 22 22'><path d='M7 6h6.2c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V8c0-1.1.9-2 2-2Zm2.2 3.2 4.3 2.8-4.3 2.8V9.2Z' fill='currentColor'/></svg>"
};

function detectAttachmentType(fileObject: File): AttachmentType {
  if (fileObject.type.startsWith('video/')) {
    return 'video';
  }
  return 'image';
}

function createVideoThumbnail(fileObject: File): Promise<string> {
  return new Promise((resolve) => {
    const previewVideoElement = document.createElement('video');
    const objectUrl = URL.createObjectURL(fileObject);
    let isFinished = false;

    const finish = (thumbnailUrl: string) => {
      if (isFinished) {
        return;
      }
      isFinished = true;
      previewVideoElement.removeAttribute('src');
      previewVideoElement.load();
      URL.revokeObjectURL(objectUrl);
      resolve(thumbnailUrl);
    };

    previewVideoElement.preload = 'metadata';
    previewVideoElement.muted = true;
    previewVideoElement.playsInline = true;
    previewVideoElement.src = objectUrl;

    previewVideoElement.addEventListener(
      'loadeddata',
      () => {
        try {
          const thumbnailCanvas = document.createElement('canvas');
          thumbnailCanvas.width = 104;
          thumbnailCanvas.height = 52;
          const thumbnailContext = thumbnailCanvas.getContext('2d');
          if (!thumbnailContext) {
            finish(FALLBACK_ICON.video);
            return;
          }
          thumbnailContext.drawImage(previewVideoElement, 0, 0, 104, 52);
          finish(thumbnailCanvas.toDataURL('image/jpeg', 0.82));
        } catch {
          finish(FALLBACK_ICON.video);
        }
      },
      { once: true }
    );

    previewVideoElement.addEventListener('error', () => finish(FALLBACK_ICON.video), { once: true });
    setTimeout(() => finish(FALLBACK_ICON.video), 2000);
  });
}

async function createThumbnail(fileObject: File, attachmentType: AttachmentType): Promise<string> {
  if (attachmentType === 'image') {
    return URL.createObjectURL(fileObject);
  }
  return createVideoThumbnail(fileObject);
}

function reindexAttachmentList(existingAttachments: AttachedFile[]): AttachedFile[] {
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
  const [attachmentItems, setAttachmentItems] = useState<AttachedFile[]>([]);
  const [nextAttachmentId, setNextAttachmentId] = useState<number>(1);

  const attachmentTagList = useMemo(() => attachmentItems.map((attachmentItem) => attachmentItem.tag), [attachmentItems]);

  const addFiles = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) {
      return;
    }

    const fileArray = Array.from(selectedFiles);
    const builtAttachments = await Promise.all(
      fileArray.map(async (selectedFile, fileOffset) => {
        const attachmentType = detectAttachmentType(selectedFile);
        const thumbnailUrl = await createThumbnail(selectedFile, attachmentType);
        return {
          id: nextAttachmentId + fileOffset,
          file: selectedFile,
          type: attachmentType,
          index: 0,
          tag: '',
          thumbnailUrl
        } satisfies AttachedFile;
      })
    );

    setNextAttachmentId((currentNextAttachmentId) => currentNextAttachmentId + builtAttachments.length);
    setAttachmentItems((currentAttachmentItems) => reindexAttachmentList([...currentAttachmentItems, ...builtAttachments]));
  };

  const removeAttachmentById = (attachmentId: number) => {
    setAttachmentItems((currentAttachmentItems) => {
      const matchedAttachment = currentAttachmentItems.find((attachmentItem) => attachmentItem.id === attachmentId);
      if (matchedAttachment && matchedAttachment.thumbnailUrl.startsWith('blob:')) {
        URL.revokeObjectURL(matchedAttachment.thumbnailUrl);
      }
      return reindexAttachmentList(currentAttachmentItems.filter((attachmentItem) => attachmentItem.id !== attachmentId));
    });
  };

  return { attachmentItems, attachmentTagList, addFiles, removeAttachmentById, fallbackIcon: FALLBACK_ICON };
}
