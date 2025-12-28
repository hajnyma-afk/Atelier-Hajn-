
import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { Button } from './Button';

interface ImageCropperProps {
  imageSrc: string;
  aspectRatio: number; // width / height
  onCrop: (croppedBase64: string) => void;
  onCancel: () => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
  imageSrc,
  aspectRatio,
  onCrop,
  onCancel
}) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Constants for the UI crop area
  const CROP_WIDTH = 500;
  const cropHeight = CROP_WIDTH / aspectRatio;

  useEffect(() => {
    setImageLoaded(false);
    setImageError(null);
    setImageSize({ width: 0, height: 0 });

    const img = new Image();
    // Images are now proxied through backend, so CORS is not needed
    img.src = imageSrc;

    img.onload = () => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoaded(true);

      // Calculate initial zoom to cover
      const scaleW = CROP_WIDTH / img.naturalWidth;
      const scaleH = cropHeight / img.naturalHeight;
      const initialScale = Math.max(scaleW, scaleH);
      setZoom(initialScale);

      // Center initial position
      setOffset({
        x: (CROP_WIDTH - img.naturalWidth * initialScale) / 2,
        y: (cropHeight - img.naturalHeight * initialScale) / 2
      });
    };

    img.onerror = (error) => {
      console.error('Failed to load image in cropper:', imageSrc, error);
      setImageError(`Nepodařilo se načíst obrázek. Zkontrolujte URL: ${imageSrc}`);
    };
  }, [imageSrc, cropHeight]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    setOffset({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const newZoom = zoom - e.deltaY * 0.001;
    setZoom(Math.max(0.1, newZoom));
  };

  const handleCrop = () => {
    const canvas = document.createElement('canvas');
    // Set high resolution output
    const outputWidth = 1200;
    const outputHeight = outputWidth / aspectRatio;

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const ctx = canvas.getContext('2d');
    if (ctx && imageRef.current) {
      // Background fill
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Math to map UI coordinates to Canvas coordinates
      const scaleRatio = outputWidth / CROP_WIDTH;

      const drawX = offset.x * scaleRatio;
      const drawY = offset.y * scaleRatio;
      const drawW = imageSize.width * zoom * scaleRatio;
      const drawH = imageSize.height * zoom * scaleRatio;

      ctx.drawImage(imageRef.current, drawX, drawY, drawW, drawH);

      // Changed to image/webp for consistent output format
      onCrop(canvas.toDataURL('image/webp', 0.9));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <Move size={16} />
            Upravit pozici a velikost
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-black">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 p-8 bg-gray-100 flex items-center justify-center select-none overflow-hidden relative">
           {/* Crop Mask Area */}
           <div
              ref={containerRef}
              className="relative bg-white shadow-2xl cursor-move overflow-hidden border-2 border-black/10"
              style={{ width: CROP_WIDTH, height: cropHeight }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
              onWheel={handleWheel}
           >
              {imageError ? (
                <div className="absolute inset-0 flex items-center justify-center text-red-500 text-sm p-4 text-center">
                  {imageError}
                </div>
              ) : imageSrc && imageLoaded ? (
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Crop target"
                  className="max-w-none absolute origin-top-left pointer-events-none"
                  style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    width: imageSize.width,
                    height: imageSize.height
                  }}
                  draggable={false}
                  onError={() => setImageError('Chyba při načítání obrázku')}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                  Načítání obrázku...
                </div>
              )}

              {/* Grid Overlay Rule of Thirds */}
              <div className="absolute inset-0 pointer-events-none opacity-30">
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white drop-shadow-md"></div>
                <div className="absolute right-1/3 top-0 bottom-0 w-px bg-white drop-shadow-md"></div>
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white drop-shadow-md"></div>
                <div className="absolute bottom-1/3 left-0 right-0 h-px bg-white drop-shadow-md"></div>
              </div>
           </div>
        </div>

        <div className="p-6 bg-white border-t border-gray-100 space-y-6">
          <div className="flex items-center gap-4">
            <ZoomOut size={16} className="text-gray-400" />
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
            />
            <ZoomIn size={16} className="text-gray-400" />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onCancel}>Zrušit</Button>
            <Button onClick={handleCrop}>
              <Check size={16} />
              Použít výřez
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
