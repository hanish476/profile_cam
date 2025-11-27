import { useEffect, useRef, useState } from "react";
import {
  Upload,
  Download,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Move,
  Camera,
} from "lucide-react";

export default function GalleryCapture() {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [imageUrl, setImageUrl] = useState(null);
  const [templateImage, setTemplateImage] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Touch state ref (no types)
  const touchStartRef = useRef(null);

  // Load template
  useEffect(() => {
    const img = new Image();
    img.src = "/facebook.png";
    img.onload = () => setTemplateImage(img);
  }, []);

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setUploadedImage(img);
        setRotation(0);
        setScale(1);
        setPosition({ x: 0, y: 0 });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Capture final image
  const capture = () => {
    const canvas = canvasRef.current;
    if (!canvas || !templateImage || !uploadedImage) return;

    canvas.width = 1080;
    canvas.height = 1080;

    const ctx = canvas.getContext("2d");

    const previewSize = 288; // .w-72 h-72
    const factor = 1080 / previewSize;

    // --- clip circle (for photo only) ---
    ctx.save();
    ctx.beginPath();
    ctx.arc(540, 540, 540, 0, Math.PI * 2);
    ctx.clip();

    // --- apply CSS-matching transforms ---
    ctx.translate(540 + position.x * factor, 540 + position.y * factor);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(
      uploadedImage,
      -uploadedImage.width / 2,
      -uploadedImage.height / 2
    );

    ctx.restore();

    // --- draw template ABOVE photo ---
    ctx.drawImage(templateImage, 0, 0, 1080, 1080);

    setImageUrl(canvas.toDataURL("image/png"));
  };


  // Reset transformations
  const resetAll = () => {
    setRotation(0);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // === Touch Handlers (Mobile) ===

  const handleTouchStart = (e) => {
    if (!uploadedImage || e.touches.length === 0) return;
    e.preventDefault();

    const touches = e.touches;
    touchStartRef.current = {
      touches: Array.from(touches),
      position: { ...position },
      scale,
      rotation,
    };

    if (touches.length === 1) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clientX = touches[0].clientX;
      const clientY = touches[0].clientY;
      setDragStart({
        x: clientX - rect.left,
        y: clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  const getDistance = (t1, t2) => {
    return Math.sqrt(
      Math.pow(t2.clientX - t1.clientX, 2) + Math.pow(t2.clientY - t1.clientY, 2)
    );
  };

  const getMidpoint = (t1, t2) => {
    return {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    };
  };

  const handleTouchMove = (e) => {
    if (!uploadedImage || !touchStartRef.current || e.touches.length === 0) return;
    e.preventDefault();

    const touches = e.touches;
    const start = touchStartRef.current;

    if (touches.length === 1 && isDragging) {
      const rect = e.currentTarget.getBoundingClientRect();
      const currentX = touches[0].clientX - rect.left;
      const currentY = touches[0].clientY - rect.top;

      const deltaX = currentX - dragStart.x;
      const deltaY = currentY - dragStart.y;

      setPosition((prev) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));

      setDragStart({ x: currentX, y: currentY });
    } else if (touches.length === 2 && start.touches && start.touches.length === 2) {
      const [t1, t2] = touches;
      const [st1, st2] = start.touches;

      const currentDistance = getDistance(t1, t2);
      const startDistance = getDistance(st1, st2);

      if (startDistance > 0) {
        const zoom = currentDistance / startDistance;
        const newScale = Math.max(0.5, Math.min(3, start.scale * zoom));
        setScale(newScale);
      }

      const currentMid = getMidpoint(t1, t2);
      const startMid = getMidpoint(st1, st2);
      const rect = e.currentTarget.getBoundingClientRect();

      // Avoid using `newScale` before it's defined — fix:
      const finalScale = Math.max(0.5, Math.min(3, start.scale * (currentDistance / startDistance)));
      const dx = (currentMid.x - startMid.x) / finalScale;
      const dy = (currentMid.y - startMid.y) / finalScale;

      setPosition({
        x: start.position.x + dx,
        y: start.position.y + dy,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartRef.current = null;
  };

  // === Mouse Handlers (Desktop) ===

  const handleDragStart = (e) => {
    if (!uploadedImage) return;

    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(e.currentTarget);
    const borderLeftWidth = parseFloat(computedStyle.borderLeftWidth) || 0;
    const borderTopWidth = parseFloat(computedStyle.borderTopWidth) || 0;

    setDragStart({
      x: e.clientX - rect.left - borderLeftWidth,
      y: e.clientY - rect.top - borderTopWidth,
    });
  };

  const handleDragMove = (e) => {
    if (!isDragging || !uploadedImage) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(e.currentTarget);
    const borderLeftWidth = parseFloat(computedStyle.borderLeftWidth) || 0;
    const borderTopWidth = parseFloat(computedStyle.borderTopWidth) || 0;

    const currentX = e.clientX - rect.left - borderLeftWidth;
    const currentY = e.clientY - rect.top - borderTopWidth;

    const deltaX = currentX - dragStart.x;
    const deltaY = currentY - dragStart.y;

    setPosition((prev) => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY,
    }));

    setDragStart({ x: currentX, y: currentY });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    if (!uploadedImage) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.max(0.5, Math.min(3, prev * delta)));
  };

  return (
    <div className="relative bg-zinc-900 p-6 rounded-3xl shadow-xl max-w-md w-full">
      {!imageUrl ? (
        <div className="flex flex-col items-center">
          {!uploadedImage ? (
            <div className="flex flex-col items-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-xl mb-4"
              >
                <Upload size={28} />
              </button>
              <p className="text-zinc-400 text-sm">Click to upload an image</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div
                className="relative w-72 h-72 mb-4 cursor-grab active:cursor-grabbing"
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className="w-full h-full relative overflow-hidden rounded-full border-4 border-white/20">
                  <div
                    className="w-full h-full"
                    style={{
                      transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${scale})`,
                      transformOrigin: 'center',
                      transition: isDragging ? 'none' : 'transform 0.1s ease'
                    }}
                  >
                    <img
                      src={uploadedImage.src}
                      alt="Uploaded"
                      className=" object-cover"
                    />
                  </div>

                  {templateImage && (
                    <img
                      src="/facebook.png"
                      className="absolute inset-0 w-full h-full rounded-full opacity-60 pointer-events-none"
                      alt="Template"
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setRotation((prev) => prev - 5)}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full"
                >
                  <RotateCcw size={18} />
                </button>
                <button
                  onClick={() => setRotation((prev) => prev + 5)}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full"
                >
                  <RotateCw size={18} />
                </button>
                <button
                  onClick={() => setScale((prev) => Math.max(0.5, prev - 0.1))}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full"
                >
                  <ZoomOut size={18} />
                </button>
                <button
                  onClick={() => setScale((prev) => Math.min(3, prev + 0.1))}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full"
                >
                  <ZoomIn size={18} />
                </button>

                <div className="flex gap-1">
                  <button
                    onClick={() => setScale(0.7)}
                    className={`p-2 rounded-full ${Math.abs(scale - 0.7) < 0.1
                      ? "bg-teal-500 text-black"
                      : "bg-zinc-800 hover:bg-zinc-700"
                      }`}
                  >
                    <Minimize2 size={16} />
                  </button>
                  <button
                    onClick={() => setScale(1)}
                    className={`p-2 rounded-full ${Math.abs(scale - 1) < 0.1
                      ? "bg-teal-500 text-black"
                      : "bg-zinc-800 hover:bg-zinc-700"
                      }`}
                  >
                    <Move size={16} />
                  </button>
                  <button
                    onClick={() => setScale(1.3)}
                    className={`p-2 rounded-full ${Math.abs(scale - 1.3) < 0.1
                      ? "bg-teal-500 text-black"
                      : "bg-zinc-800 hover:bg-zinc-700"
                      }`}
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>

                <button
                  onClick={resetAll}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full"
                >
                  Reset
                </button>
              </div>

              <button
                onClick={capture}
                disabled={!templateImage}
                className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-xl active:scale-95 disabled:opacity-40"
              >
                <Camera size={28} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center animate-fadeIn">
          <img
            src={imageUrl}
            className="w-64 h-64 rounded-full border-4 border-white/20 object-cover mb-6"
            alt="Final"
          />

          <div className="flex gap-4">
            <button
              onClick={() => setImageUrl(null)}
              className="px-5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center gap-2"
            >
              <RotateCcw size={18} /> Retake
            </button>

            <a
              href={imageUrl}
              download={`profile-${Date.now()}.png`}
              className="px-5 py-2 rounded-lg bg-teal-500 text-black font-bold hover:bg-teal-400 flex items-center gap-2"
            >
              <Download size={18} /> Save
            </a>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}