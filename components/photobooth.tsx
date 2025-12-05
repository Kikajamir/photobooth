"use client"

import { useRef, useEffect, useState } from "react"
import Webcam from "react-webcam"

const FRAMES = [
  { id: "1", name: "Frame 1", url: "/frame/1.png" },
  { id: "2", name: "Frame 2", url: "/frame/2.png" },
  { id: "3", name: "Frame 3", url: "/frame/3.png" },
]

export default function PhotoboothUI() {
  const webcamRef = useRef<Webcam>(null)
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [capturedImages, setCapturedImages] = useState<(string | null)[]>([null, null, null, null])
  const [currentShot, setCurrentShot] = useState<number>(0)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isReviewScreenActive, setIsReviewScreenActive] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [collageImage, setCollageImage] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isSessionComplete, setIsSessionComplete] = useState(false)

  useEffect(() => {
    if (countdown === null || previewImage !== null || isSessionComplete) return

    if (countdown === 0) {
      handleCapture()
      setCountdown(null)
      return
    }

    timeoutRef.current = setTimeout(() => {
      setCountdown(countdown - 1)
    }, 1000)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [countdown, previewImage, isSessionComplete])

  const handleCapture = () => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      setPreviewImage(imageSrc)
      setIsCapturing(false)
    }
  }

  const handleTakePhotoClick = () => {
    if (isCapturing || previewImage !== null) return
    setIsCapturing(true)
    setCountdown(3)
  }

  const handleRetake = () => {
    setPreviewImage(null)
    setIsSessionComplete(false)
    setCountdown(3)
  }

  const handleKeepAndNext = () => {
    if (previewImage === null) return

    const newImages = [...capturedImages]
    newImages[currentShot] = previewImage
    setCapturedImages(newImages)

    if (currentShot < 3) {
      setCurrentShot(currentShot + 1)
      setPreviewImage(null)
      setIsCapturing(true)
      setCountdown(3)
    } else {
      // Last photo - go to review screen
      setPreviewImage(null)
      setIsReviewScreenActive(true)
      setIsSessionComplete(true)
    }
  }

  const handleSelectPhotoToRetake = (index: number) => {
    setCurrentShot(index)
    setPreviewImage(capturedImages[index])
    setIsSessionComplete(false)
  }

  const handleRetakeFromReview = () => {
    setPreviewImage(null)
    setIsCapturing(true)
    setCountdown(3)
  }

  const handleKeepFromReview = () => {
    setPreviewImage(null)
    setIsReviewScreenActive(true)
  }

  const handleExitReviewScreen = () => {
    setIsReviewScreenActive(false)
    setPreviewImage(null)
    setCurrentShot(0)
  }

  const handleRetakeSession = () => {
    setCapturedImages([null, null, null, null])
    setCurrentShot(0)
    setPreviewImage(null)
    setIsReviewScreenActive(false)
    setCountdown(null)
    setIsCapturing(false)
    setIsSessionComplete(false)
    setSelectedFrame(null)
  }

  const handleSelectFrame = (frameId: string) => {
    setSelectedFrame(frameId)
  }

  const buildCollage = async () => {
    if (!selectedFrame) return;
    
    // helper to load an image
    const loadImage = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
  
    // load the selected frame/background
    const frameData = FRAMES.find(f => f.id === selectedFrame);
    if (!frameData) return;
    
    const frameImg = await loadImage(frameData.url);
  
    const width = frameImg.naturalWidth;
    const height = frameImg.naturalHeight;
  
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
  
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
  
    // load the 4 captured photos
    const photos = await Promise.all(
      capturedImages.map((src) => loadImage(src || ""))
    );
  
    // 🔧 POSITIONING:
    // Each transparent slot is 572x383px.
    // We draw each captured photo into those slots so they sit perfectly inside.
    const slotWidth = 572;                    // exact photo width
    const slotHeight = 383;                   // exact photo height
    const slotX = (width - slotWidth) / 2;    // center horizontally
  
    const firstSlotTop = 130;                 // distance from top of strip to first slot
    const slotGap = 35;                       // vertical gap between slots
  
    photos.forEach((img, index) => {
      const y = firstSlotTop + index * (slotHeight + slotGap);
      ctx.drawImage(img, slotX, y, slotWidth, slotHeight);
    });
  
    // draw the frame on top so decorations sit above the photos
    ctx.drawImage(frameImg, 0, 0, width, height);
  
    const finalDataUrl = canvas.toDataURL("image/png");
    setCollageImage(finalDataUrl);
  };

  const handleCreateStrip = () => {
    buildCollage()
  }

  const handleDownloadStrip = () => {
    if (!collageImage) return
    const link = document.createElement("a")
    link.href = collageImage
    link.download = "photobooth-strip.png"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleRestartSession = () => {
    setCollageImage(null)
    setCapturedImages([null, null, null, null])
    setCurrentShot(0)
    setPreviewImage(null)
    setIsReviewScreenActive(false)
    setCountdown(null)
    setIsCapturing(false)
    setIsSessionComplete(false)
    setSelectedFrame(null)
  }

  return (
    <div className="flex items-center justify-center min-h-screen w-full p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-foreground mb-2">
            Photo
            <br />
            Booth
          </h1>
          <p className="text-muted-foreground text-lg">Strike a pose and capture 4 moments!</p>
        </div>

        {/* Frame Selection Screen */}
        {!selectedFrame ? (
          <>
            <div className="text-center mb-6">
              <p className="text-foreground font-semibold text-xl mb-2">Choose Your Frame</p>
              <p className="text-muted-foreground text-sm">Select a frame for your photo strip</p>
            </div>
            <div className="grid grid-cols-1 gap-4 mb-6">
              {FRAMES.map((frame) => (
                <button
                  key={frame.id}
                  onClick={() => handleSelectFrame(frame.id)}
                  className="relative bg-secondary rounded-3xl overflow-hidden shadow-2xl border-4 border-secondary hover:border-accent transition-all transform hover:scale-105 active:scale-95"
                >
                  <div className="relative aspect-[2/3] flex items-center justify-center">
                    <img
                      src={frame.url}
                      alt={frame.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-4">
                    <p className="text-white font-semibold text-lg text-center">{frame.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Collage Strip View */}
            {collageImage ? (
              <>
                <div className="relative mb-8">
              <div className="relative bg-secondary rounded-3xl overflow-hidden shadow-2xl border-8 border-secondary">
                <div className="relative overflow-hidden rounded-2xl flex items-center justify-center bg-muted p-4">
                  <img
                    src={collageImage || "/placeholder.svg"}
                    alt="Photo Strip"
                    className="max-w-full max-h-96 object-contain"
                  />
                </div>
              </div>

                  <div className="absolute -top-3 -left-3 w-8 h-8 bg-accent rounded-full opacity-60"></div>
                  <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-accent rounded-full opacity-60"></div>
                </div>

                <div className="text-center mb-6">
                  <p className="text-muted-foreground text-sm">Your photo strip is ready!</p>
                </div>

                <div className="flex gap-4 justify-center flex-wrap">
                  <button
                    onClick={handleDownloadStrip}
                    className="px-8 py-4 bg-accent hover:bg-accent/90 text-accent-foreground rounded-full font-bold text-lg shadow-lg transition-all transform hover:scale-105 active:scale-95"
                  >
                    Download Strip
                  </button>
                  <button
                    onClick={handleRestartSession}
                    className="px-8 py-4 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-full font-bold text-lg shadow-lg transition-all transform hover:scale-105 active:scale-95"
                  >
                    Restart Session
                  </button>
                </div>
              </>
            ) : (
              <>
                {isReviewScreenActive && previewImage === null ? (
              <>
                {/* Review All Photos Screen */}
                <div className="mb-8">
                  <p className="text-center text-foreground font-semibold mb-4">Review Your Photos</p>
                  <p className="text-center text-muted-foreground text-sm mb-6">Tap any photo to retake</p>
                  <div className="grid grid-cols-2 gap-4 bg-secondary rounded-3xl p-6 shadow-2xl border-8 border-secondary">
                    {capturedImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectPhotoToRetake(idx)}
                        className="aspect-square rounded-2xl overflow-hidden shadow-md border-4 border-accent/30 hover:border-accent hover:scale-105 transition-all cursor-pointer"
                      >
                        <img
                          src={img || "/placeholder.svg"}
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 justify-center flex-wrap">
                  <button
                    onClick={handleRetakeSession}
                    className="px-8 py-4 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-full font-bold text-lg shadow-lg transition-all transform hover:scale-105 active:scale-95"
                  >
                    Restart Session
                  </button>
                  <button
                    onClick={handleCreateStrip}
                    className="px-8 py-4 bg-accent hover:bg-accent/90 text-accent-foreground rounded-full font-bold text-lg shadow-lg transition-all transform hover:scale-105 active:scale-95"
                  >
                    Create Strip
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Camera Preview or Photo Preview */}
                {previewImage === null ? (
                  <>
                    {/* Live Camera View */}
                    <div className="relative mb-8">
                      <div className="relative bg-secondary rounded-3xl overflow-hidden shadow-2xl border-8 border-secondary">
                        {cameraError ? (
                          <div className="aspect-square flex items-center justify-center bg-muted p-8 rounded-2xl">
                            <p className="text-center text-sm text-muted-foreground">{cameraError}</p>
                          </div>
                        ) : (
                          <div className="relative aspect-square overflow-hidden rounded-2xl">
                            <Webcam
                              ref={webcamRef}
                              screenshotFormat="image/png"
                              className="w-full h-full object-cover"
                              videoConstraints={{
                                facingMode: "user",
                                width: 1280,
                                height: 960,
                              }}
                              mirrored={true}
                              onUserMediaError={() =>
                                setCameraError("Unable to access camera. Please check permissions.")
                              }
                            />

                            {countdown !== null && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                                <div className="text-white text-9xl font-black drop-shadow-lg animate-pulse">
                                  {countdown > 0 ? countdown : "📸"}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="absolute -top-3 -left-3 w-8 h-8 bg-accent rounded-full opacity-60"></div>
                      <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-accent rounded-full opacity-60"></div>
                    </div>

                    <div className="text-center mb-6">
                      <p className="text-muted-foreground text-sm">Photo {currentShot + 1} of 4</p>
                    </div>

                    <div className="flex gap-4 justify-center">
                      <button
                        onClick={handleTakePhotoClick}
                        disabled={isCapturing}
                        className="flex items-center justify-center gap-3 px-8 py-4 bg-accent hover:bg-accent/90 text-accent-foreground rounded-full font-bold text-lg shadow-lg transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="text-2xl">📷</span>
                        Take Photo
                      </button>
                    </div>

                    {!isCapturing && countdown === null && (
                      <p className="text-center text-sm text-muted-foreground mt-6">Camera is ready. Smile!</p>
                    )}
                    {countdown !== null && (
                      <p className="text-center text-sm text-accent font-semibold mt-6">Get ready...</p>
                    )}
                  </>
                ) : (
                  <>
                    {/* Preview screen for single photo (before review or retaking) */}
                    <div className="relative mb-8">
                      <div className="relative bg-secondary rounded-3xl overflow-hidden shadow-2xl border-8 border-secondary">
                        <div className="relative aspect-square overflow-hidden rounded-2xl">
                          <img
                            src={previewImage || "/placeholder.svg"}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      <div className="absolute -top-3 -left-3 w-8 h-8 bg-accent rounded-full opacity-60"></div>
                      <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-accent rounded-full opacity-60"></div>
                    </div>

                    <div className="text-center mb-6">
                      <p className="text-muted-foreground text-sm">Photo {currentShot + 1} of 4</p>
                    </div>

                    <div className="flex gap-4 justify-center flex-wrap">
                      <button
                        onClick={isReviewScreenActive ? handleRetakeFromReview : handleRetake}
                        className="px-8 py-4 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-full font-bold text-lg shadow-lg transition-all transform hover:scale-105 active:scale-95"
                      >
                        Retake
                      </button>
                      <button
                        onClick={isReviewScreenActive ? handleKeepFromReview : handleKeepAndNext}
                        className="px-8 py-4 bg-accent hover:bg-accent/90 text-accent-foreground rounded-full font-bold text-lg shadow-lg transition-all transform hover:scale-105 active:scale-95"
                      >
                        {isReviewScreenActive ? "Keep" : "Keep & Next"}
                      </button>
                    </div>
                  </>
                )}
              </>
              )}
            </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
