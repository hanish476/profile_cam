import { useEffect, useRef, useState } from "react";
import { Upload, Download, RotateCcw, RotateCw, ZoomIn, ZoomOut, Maximize2, Minimize2, Move, Camera } from "lucide-react";

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
        // Reset transformations when new image is loaded
        setRotation(0);
        setScale(1);
        setPosition({ x: 0, y: 0 });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Capture image with mask + template
  const capture = () => {
    const canvas = canvasRef.current;
    if (!canvas || !templateImage || !uploadedImage) return;

    canvas.width = 1080;
    canvas.height = 1080;

    const ctx = canvas.getContext("2d");

    // Draw circle mask
    ctx.beginPath();
    ctx.arc(540, 540, 540, 0, Math.PI * 2);
    ctx.closePath();
    ctx.save();
    ctx.clip();

    // Get preview container size
    const previewContainer = document.querySelector('.w-72.h-72'); // Find the preview container
    const previewSize = previewContainer ? 288 : 288; // 72 * 4 (using rem to px conversion)

    // Calculate the center of the output canvas
    const outputCenterX = 540;
    const outputCenterY = 540;

    // Apply transformations in the same order as CSS
    ctx.save();
    ctx.translate(outputCenterX, outputCenterY);
    ctx.rotate(rotation * Math.PI / 180);

    // Calculate scaled image dimensions
    const scaledWidth = uploadedImage.width * scale;
    const scaledHeight = uploadedImage.height * scale;

    // Draw image with position offset
    ctx.drawImage(
      uploadedImage,
      position.x - scaledWidth / 2,
      position.y - scaledHeight / 2,
      scaledWidth,
      scaledHeight
    );

    ctx.restore();
    ctx.restore(); // End clip

    // Draw template on top
    ctx.drawImage(templateImage, 0, 0, 1080, 1080);

    // Export final png
    const png = canvas.toDataURL("image/png");
    setImageUrl(png);
  };
  // Reset all settings
  const resetAll = () => {
    setRotation(0);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Handle drag start for positioning
  const handleDragStart = (e) => {
    if (!uploadedImage) return;

    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(e.currentTarget);
    const borderLeftWidth = parseFloat(computedStyle.borderLeftWidth);
    const borderTopWidth = parseFloat(computedStyle.borderTopWidth);

    setDragStart({
      x: e.clientX - rect.left - borderLeftWidth,
      y: e.clientY - rect.top - borderTopWidth
    });
  };

  // Handle drag move for positioning
  const handleDragMove = (e) => {
    if (!isDragging || !uploadedImage) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(e.currentTarget);
    const borderLeftWidth = parseFloat(computedStyle.borderLeftWidth);
    const borderTopWidth = parseFloat(computedStyle.borderTopWidth);

    const currentX = e.clientX - rect.left - borderLeftWidth;
    const currentY = e.clientY - rect.top - borderTopWidth;

    const deltaX = currentX - dragStart.x;
    const deltaY = currentY - dragStart.y;

    setPosition(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));

    setDragStart({ x: currentX, y: currentY });
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Handle mouse wheel for zoom
  const handleWheel = (e) => {
    if (!uploadedImage) return;

    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(0.5, Math.min(3, prev * delta)));
  };

  return (
    <div className="relative bg-zinc-900 p-6 rounded-3xl shadow-xl max-w-md w-full">
      {!imageUrl ? (
        <div className="flex flex-col items-center">
          {/* Upload button */}
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
              {/* Preview area */}
              <div
                className="relative w-72 h-72 mb-4 cursor-grab active:cursor-grabbing"
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onWheel={handleWheel}
              >
                <div className="w-full h-full relative overflow-hidden rounded-full border-4 border-white/20">
                  <div
                    className="w-full h-full rounded-full object-cover"
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

                  {/* Template overlay preview */}
                  {templateImage && (
                    <img
                      src="/facebook.png"
                      className="absolute inset-0 w-full h-full rounded-full object-cover opacity-60 pointer-events-none"
                      alt="Template"
                    />
                  )}
                </div>
              </div>

              {/* Editing controls */}
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

                {/* Size options */}
                <div className="flex gap-1">
                  <button
                    onClick={() => setScale(0.7)}
                    className={`p-2 rounded-full ${Math.abs(scale - 0.7) < 0.1 ? 'bg-teal-500 text-black' : 'bg-zinc-800 hover:bg-zinc-700'}`}
                  >
                    <Minimize2 size={16} />
                  </button>
                  <button
                    onClick={() => setScale(1)}
                    className={`p-2 rounded-full ${Math.abs(scale - 1) < 0.1 ? 'bg-teal-500 text-black' : 'bg-zinc-800 hover:bg-zinc-700'}`}
                  >
                    <Move size={16} />
                  </button>
                  <button
                    onClick={() => setScale(1.3)}
                    className={`p-2 rounded-full ${Math.abs(scale - 1.3) < 0.1 ? 'bg-teal-500 text-black' : 'bg-zinc-800 hover:bg-zinc-700'}`}
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