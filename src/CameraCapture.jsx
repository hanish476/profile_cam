import { useEffect, useRef, useState } from "react";
import { Camera, Download, RotateCcw } from "lucide-react";

export default function CameraCapture() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [templateImage, setTemplateImage] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [flash, setFlash] = useState(false);

  // Load template
  useEffect(() => {
    const img = new Image();
    img.src = "/facebook.png"; // public folder
    img.onload = () => setTemplateImage(img);
  }, []);

  // Setup camera
  useEffect(() => {
    let stream;

    async function initCam() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 1080, height: 1080 },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setIsReady(true);
        }
      } catch (e) {
        alert("Camera permission denied or not available.");
        console.error(e);
      }
    }

    if (!imageUrl) initCam();

    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [imageUrl]);

  // Capture image with mask + template
  const capture = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video || !templateImage) return;

    // Flash
    setFlash(true);
    setTimeout(() => setFlash(false), 150);

    // Canvas = 1080 × 1080 (template size)
    canvas.width = 1080;
    canvas.height = 1080;

    const ctx = canvas.getContext("2d");

    // Draw circle mask for camera
    ctx.beginPath();
    ctx.arc(540, 540, 540, 0, Math.PI * 2);
    ctx.closePath();
    ctx.save();
    ctx.clip();

    // Draw scaled video perfectly inside circle (flipped horizontally)
    const vW = video.videoWidth;
    const vH = video.videoHeight;
    const aspectVideo = vW / vH;
    const aspectCanvas = 1;

    let drawW, drawH, startX, startY;

    if (aspectVideo > aspectCanvas) {
      drawH = 1080;
      drawW = drawH * aspectVideo;
      startX = (1080 - drawW) / 2;
      startY = 0;
    } else {
      drawW = 1080;
      drawH = drawW / aspectVideo;
      startY = (1080 - drawH) / 2;
      startX = 0;
    }

    // Flip horizontally before drawing
    ctx.translate(1080, 0); // Move to the right edge
    ctx.scale(-1, 1); // Flip horizontally

    ctx.drawImage(video, startX, startY, drawW, drawH);
    ctx.restore();

    // Draw template on top
    ctx.drawImage(templateImage, 0, 0, 1080, 1080);

    // Export final png
    const png = canvas.toDataURL("image/png");
    setImageUrl(png);
  };

  return (
    <div className="relative bg-zinc-900 p-6 rounded-3xl shadow-xl max-w-md w-full">
      {/* FLASH */}
      <div
        className={`absolute inset-0 bg-white opacity-0 pointer-events-none transition duration-200 ${
          flash ? "opacity-100" : ""
        }`}
      />

      {!imageUrl ? (
        <div className="flex flex-col items-center">
          {/* Perfect 1080×1080 preview — scaled down */}
          <div className="relative w-72 h-72 mb-6">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full rounded-full object-cover border-4 border-white/20 ${
                isReady ? "" : "opacity-40"
              }`}
              style={{ transform: 'scaleX(-1)' }} // Mirror the preview
            />

            {/* Template overlay preview */}
            {templateImage && (
              <img
                src="/facebook.png"
                className="absolute inset-0 w-full h-full rounded-full object-cover opacity-60 pointer-events-none"
              />
            )}
          </div>

          <button
            onClick={capture}
            disabled={!isReady || !templateImage}
            className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-xl active:scale-95 disabled:opacity-40"
          >
            <Camera size={28} />
          </button>
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