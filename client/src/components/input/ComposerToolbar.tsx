import { useRef } from 'react';

interface ComposerToolbarProps {
  isSendEnabled: boolean;
  onAttachFiles: (selectedFiles: FileList | null) => void;
  onSend: () => void;
}

export default function ComposerToolbar({ isSendEnabled, onAttachFiles, onSend }: ComposerToolbarProps) {
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="composer-toolbar">
      <div className="toolbar-left">
        <input
          ref={hiddenFileInputRef}
          type="file"
          accept="video/*,image/*"
          multiple
          hidden
          onChange={(event) => {
            onAttachFiles(event.target.files);
            event.target.value = '';
          }}
        />
        <button className="attach-button" type="button" onClick={() => hiddenFileInputRef.current?.click()}>+ 첨부</button>
      </div>
      <div className="toolbar-right">
        <button className={`send-button${isSendEnabled ? ' active' : ''}`} type="button" aria-label="전송" onClick={onSend}>→</button>
      </div>
    </div>
  );
}
