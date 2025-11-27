import { useEffect, useRef, useState } from "react";
import {
  Upload, Download, RotateCcw, RotateCw, 
  ZoomIn, ZoomOut, Maximize2, Minimize2, Move, Camera
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

  // Touch state
  const touchStartRef = useRef(null);

  // Load template
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/facebook.png";
    img.onload = () => setTemplateImage(img);
    img.onerror = () => console.error("Template failed to load");
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

  // Capture function
  const capture = () => {
    const canvas = canvasRef.current;
    if (!canvas || !templateImage || !uploadedImage) return;

    const canvasSize = 1080;
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    const ctx = canvas.getContext("2d");

    // Create circular clipping path first
    ctx.beginPath();
    ctx.arc(canvasSize / 2, canvasSize / 2, canvasSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Draw selected image first
    const imgW = uploadedImage.width;
    const imgH = uploadedImage.height;
    const baseScaleX = canvasSize / imgW;
    const baseScaleY = canvasSize / imgH;
    const baseScale = Math.max(baseScaleX, baseScaleY);
    const finalScale = baseScale * scale;

    const scaledW = imgW * finalScale;
    const scaledH = imgH * finalScale;

    const previewSize = 288;
    const scaleRatio = canvasSize / previewSize;

    ctx.save();
    ctx.translate(canvasSize / 2 + position.x * scaleRatio, canvasSize / 2 + position.y * scaleRatio);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(
      uploadedImage,
      -scaledW / 2,
      -scaledH / 2,
      scaledW,
      scaledH
    );
    ctx.restore();

    // Draw template on top (within clip)
    ctx.drawImage(templateImage, 0, 0, canvasSize, canvasSize);

    // Export
    const png = canvas.toDataURL("image/png");
    setImageUrl(png);
  };

  // Reset all
  const resetAll = () => {
    setRotation(0);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Mouse handlers
  const handleMouseDown = (e) => {
    if (!uploadedImage) return;
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left - position.x,
      y: e.clientY - rect.top - position.y,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !uploadedImage) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const newX = e.clientX - rect.left - dragStart.x;
    const newY = e.clientY - rect.top - dragStart.y;
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers
  const handleTouchStart = (e) => {
    if (!uploadedImage) return;
    const touches = e.touches;
    if (touches.length === 1) {
      const rect = e.currentTarget.getBoundingClientRect();
      setDragStart({
        x: touches[0].clientX - rect.left - position.x,
        y: touches[0].clientY - rect.top - position.y,
      });
      setIsDragging(true);
    }
    touchStartRef.current = touches.length === 2 ? [...touches] : null;
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (!uploadedImage) return;
    
    const touches = e.touches;
    
    if (touches.length === 1 && isDragging) {
      const rect = e.currentTarget.getBoundingClientRect();
      const newX = touches[0].clientX - rect.left - dragStart.x;
      const newY = touches[0].clientY - rect.top - dragStart.y;
      setPosition({ x: newX, y: newY });
    } 
    else if (touches.length === 2 && touchStartRef.current) {
      const [t1, t2] = touches;
      const [st1, st2] = touchStartRef.current;
      
      const startDistance = Math.hypot(st1.clientX - st2.clientX, st1.clientY - st2.clientY);
      const currentDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      
      const scaleDiff = currentDistance / startDistance;
      setScale(prev => Math.max(0.5, Math.min(3, prev * scaleDiff)));
      
      touchStartRef.current = [...touches];
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartRef.current = null;
  };

  // Wheel handler
  const handleWheel = (e) => {
    e.preventDefault();
    if (!uploadedImage) return;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(0.5, Math.min(3, prev * delta)));
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
              {/* Preview Area */}
              <div
                className="relative w-72 h-72 mb-4 cursor-grab active:cursor-grabbing rounded-full overflow-hidden border-4 border-white/20"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Apply circular mask to preview */}
                <div className="w-full h-full rounded-full overflow-hidden relative">
                  {/* Selected image with transforms */}
                  <div
                    className="w-full h-full"
                    style={{
                      transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${scale})`,
                      transformOrigin: "center",
                      transition: isDragging ? "none" : "transform 0.1s ease",
                    }}
                  >
                    <img
                      src={uploadedImage.src}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Template overlay with circular mask */}
                  {templateImage && (
                    <div className="absolute inset-0 w-full h-full rounded-full overflow-hidden">
                      <img
                        src="/facebook.png"
                        className="w-full h-full object-cover pointer-events-none"
                        alt="Template"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Editing Controls */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setRotation(prev => prev - 5)}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full"
                >
                  <RotateCcw size={18} />
                </button>
                <button
                  onClick={() => setRotation(prev => prev + 5)}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full"
                >
                  <RotateCw size={18} />
                </button>
                <button
                  onClick={() => setScale(prev => Math.max(0.5, prev - 0.1))}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full"
                >
                  <ZoomOut size={18} />
                </button>
                <button
                  onClick={() => setScale(prev => Math.min(3, prev + 0.1))}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full"
                >
                  <ZoomIn size={18} />
                </button>

                <div className="flex gap-1">
                  <button
                    onClick={() => setScale(0.7)}
                    className={`p-2 rounded-full ${
                      Math.abs(scale - 0.7) < 0.1
                        ? "bg-teal-500 text-black"
                        : "bg-zinc-800 hover:bg-zinc-700"
                    }`}
                  >
                    <Minimize2 size={16} />
                  </button>
                  <button
                    onClick={() => setScale(1)}
                    className={`p-2 rounded-full ${
                      Math.abs(scale - 1) < 0.1
                        ? "bg-teal-500 text-black"
                        : "bg-zinc-800 hover:bg-zinc-700"
                    }`}
                  >
                    <Move size={16} />
                  </button>
                  <button
                    onClick={() => setScale(1.3)}
                    className={`p-2 rounded-full ${
                      Math.abs(scale - 1.3) < 0.1
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
                className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-xl active:scale-95"
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
            alt="Final Profile Picture"
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
              download={`profile-${new Date().getTime()}.png`}
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