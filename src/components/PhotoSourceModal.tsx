import { useRef } from 'react';

interface PhotoSourceModalProps {
  onFileSelected: (file: File) => void;
  onCancel: () => void;
}

export default function PhotoSourceModal({ onFileSelected, onCancel }: PhotoSourceModalProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <div className="photo-source-overlay" onClick={onCancel}>
      <div className="photo-source-modal" onClick={(e) => e.stopPropagation()}>
        <h3>בחר מקור תמונה</h3>
        <div className="photo-source-buttons">
          <button
            className="photo-source-btn"
            onClick={() => cameraInputRef.current?.click()}
          >
            <span className="photo-source-icon">📷</span>
            צלם תמונה
          </button>
          <button
            className="photo-source-btn"
            onClick={() => galleryInputRef.current?.click()}
          >
            <span className="photo-source-icon">🖼️</span>
            העלה מהגלריה
          </button>
        </div>
        <button className="photo-source-cancel" onClick={onCancel}>ביטול</button>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          style={{ display: 'none' }}
          onChange={handleChange}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
