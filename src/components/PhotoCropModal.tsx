import { useRef, useEffect, useCallback } from 'react';

interface PhotoCropModalProps {
  file: File;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

const CIRCLE_SIZE = 320; // display diameter in px
const OUTPUT_SIZE = 400; // export canvas size in px

export default function PhotoCropModal({ file, onConfirm, onCancel }: PhotoCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);
  const lastPinchDistRef = useRef<number | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CIRCLE_SIZE, CIRCLE_SIZE);
    ctx.drawImage(
      img,
      offsetRef.current.x,
      offsetRef.current.y,
      img.naturalWidth * scaleRef.current,
      img.naturalHeight * scaleRef.current,
    );
  }, []);

  const minScale = useCallback((img: HTMLImageElement) =>
    Math.max(CIRCLE_SIZE / img.naturalWidth, CIRCLE_SIZE / img.naturalHeight),
  []);

  const clamp = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth * scaleRef.current;
    const h = img.naturalHeight * scaleRef.current;
    offsetRef.current.x = Math.min(0, Math.max(CIRCLE_SIZE - w, offsetRef.current.x));
    offsetRef.current.y = Math.min(0, Math.max(CIRCLE_SIZE - h, offsetRef.current.y));
  }, []);

  useEffect(() => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      imgRef.current = img;
      const s = minScale(img);
      scaleRef.current = s;
      offsetRef.current = {
        x: (CIRCLE_SIZE - img.naturalWidth * s) / 2,
        y: (CIRCLE_SIZE - img.naturalHeight * s) / 2,
      };
      draw();
    };
    img.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, minScale, draw]);

  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: offsetRef.current.x,
      startOffsetY: offsetRef.current.y,
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    offsetRef.current = {
      x: dragRef.current.startOffsetX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.startOffsetY + (e.clientY - dragRef.current.startY),
    };
    clamp();
    draw();
  };

  const onMouseUp = () => { dragRef.current = null; };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const img = imgRef.current;
    if (!img) return;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(minScale(img), scaleRef.current * factor);
    const cx = CIRCLE_SIZE / 2;
    const cy = CIRCLE_SIZE / 2;
    offsetRef.current.x = cx - (cx - offsetRef.current.x) * (newScale / scaleRef.current);
    offsetRef.current.y = cy - (cy - offsetRef.current.y) * (newScale / scaleRef.current);
    scaleRef.current = newScale;
    clamp();
    draw();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      dragRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        startOffsetX: offsetRef.current.x,
        startOffsetY: offsetRef.current.y,
      };
      lastPinchDistRef.current = null;
    } else if (e.touches.length === 2) {
      dragRef.current = null;
      lastPinchDistRef.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const img = imgRef.current;
    if (!img) return;
    if (e.touches.length === 1 && dragRef.current) {
      const t = e.touches[0];
      offsetRef.current = {
        x: dragRef.current.startOffsetX + (t.clientX - dragRef.current.startX),
        y: dragRef.current.startOffsetY + (t.clientY - dragRef.current.startY),
      };
      clamp();
      draw();
    } else if (e.touches.length === 2 && lastPinchDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const ratio = dist / lastPinchDistRef.current;
      const newScale = Math.max(minScale(img), scaleRef.current * ratio);
      const cx = CIRCLE_SIZE / 2;
      const cy = CIRCLE_SIZE / 2;
      offsetRef.current.x = cx - (cx - offsetRef.current.x) * (newScale / scaleRef.current);
      offsetRef.current.y = cy - (cy - offsetRef.current.y) * (newScale / scaleRef.current);
      scaleRef.current = newScale;
      lastPinchDistRef.current = dist;
      clamp();
      draw();
    }
  };

  const onTouchEnd = () => {
    dragRef.current = null;
    lastPinchDistRef.current = null;
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = OUTPUT_SIZE;
    exportCanvas.height = OUTPUT_SIZE;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;
    const ratio = OUTPUT_SIZE / CIRCLE_SIZE;
    ctx.drawImage(
      img,
      offsetRef.current.x * ratio,
      offsetRef.current.y * ratio,
      img.naturalWidth * scaleRef.current * ratio,
      img.naturalHeight * scaleRef.current * ratio,
    );
    exportCanvas.toBlob((blob) => {
      if (blob) onConfirm(blob);
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="photo-crop-overlay">
      <div className="photo-crop-modal">
        <canvas
          ref={canvasRef}
          width={CIRCLE_SIZE}
          height={CIRCLE_SIZE}
          className="photo-crop-circle-wrapper"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
        <p className="photo-crop-hint">גרור להזזה · גלגל עכבר / פינץ׳ לזום</p>
        <div className="photo-crop-actions">
          <button className="photo-crop-confirm" onClick={handleConfirm}>אישור ✓</button>
          <button className="photo-crop-cancel" onClick={onCancel}>ביטול</button>
        </div>
      </div>
    </div>
  );
}
