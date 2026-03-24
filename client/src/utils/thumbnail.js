import { FALLBACK_ICON } from './fallbackIcons';
export async function createImageThumbnail(fileObject) {
    return URL.createObjectURL(fileObject);
}
export function createVideoThumbnail(fileObject) {
    return new Promise((resolve) => {
        const previewVideoElement = document.createElement('video');
        const objectUrl = URL.createObjectURL(fileObject);
        let isFinished = false;
        const finishThumbnail = (thumbnailUrl) => {
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
        previewVideoElement.addEventListener('loadeddata', () => {
            try {
                const thumbnailCanvas = document.createElement('canvas');
                thumbnailCanvas.width = 104;
                thumbnailCanvas.height = 52;
                const thumbnailContext = thumbnailCanvas.getContext('2d');
                if (!thumbnailContext) {
                    finishThumbnail(FALLBACK_ICON.video);
                    return;
                }
                thumbnailContext.drawImage(previewVideoElement, 0, 0, 104, 52);
                finishThumbnail(thumbnailCanvas.toDataURL('image/jpeg', 0.82));
            }
            catch {
                finishThumbnail(FALLBACK_ICON.video);
            }
        }, { once: true });
        previewVideoElement.addEventListener('error', () => finishThumbnail(FALLBACK_ICON.video), { once: true });
        setTimeout(() => finishThumbnail(FALLBACK_ICON.video), 2000);
    });
}
export async function createThumbnail(fileObject, attachmentType) {
    if (attachmentType === 'image') {
        return createImageThumbnail(fileObject);
    }
    return createVideoThumbnail(fileObject);
}
