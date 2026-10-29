/**
 * src/components/inventory/VisionScanModal.tsx
 *
 * Camera viewfinder modal for AI Vision Shelf-Counting & Box Audits:
 * - HTML5 <video> stream with environment-facing lens
 * - Hardware torch / flashlight toggle for low-light coolers
 * - Fallback standard image upload
 * - Built-in sample test photo presets (Cooler, Bar, Dry Storage)
 * - Multimodal Gemini model auto-switching
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Upload,
  Flashlight,
  Sparkles,
  Loader2,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';
import { useChef } from '../../context/ChefContext';
import {
  SHELF_SCAN_PRESETS,
  analyzeShelfImage,
  computeReconciliationDiff,
} from '../../services/VisionInventoryService';
import { ShelfScanPreset } from '../../types';

export const VisionScanModal: React.FC = () => {
  const {
    isVisionScanModalOpen,
    setIsVisionScanModalOpen,
    inventoryItems,
    setActiveVisionScanDiff,
  } = useChef();

  const [selectedLocation, setSelectedLocation] = useState<string>('Walk-In Cooler');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modelMode, setModelMode] = useState<'auto' | 'gemini-3.8-flash' | 'gemini-4-argon'>('auto');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera stream
  const startCamera = async () => {
    setErrorMsg(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraActive(true);

      // Check for torch capability
      const track = stream.getVideoTracks()[0];
      const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        setTorchSupported(true);
      }
    } catch (err: any) {
      console.warn('Camera could not start:', err);
      setIsCameraActive(false);
      setErrorMsg('Camera access unavailable. You can upload an image or select a sample shelf preset below.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setIsTorchOn(false);
  };

  // Toggle flashlight / torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      const nextTorch = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setIsTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch constraint error:', e);
    }
  };

  // Capture frame from live video
  const captureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCapturedImage(reader.result as string);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  // Select sample preset
  const handleSelectPreset = (preset: ShelfScanPreset) => {
    setSelectedLocation(preset.storageLocation);
    setCapturedImage(preset.imageUrl);
    stopCamera();
  };

  // Submit image to Multimodal Gemini Vision Pipeline
  const runVisionAnalysis = async () => {
    if (!capturedImage) return;
    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const result = await analyzeShelfImage(
        capturedImage,
        selectedLocation,
        inventoryItems,
        modelMode
      );

      const diffs = computeReconciliationDiff(result, inventoryItems);
      setActiveVisionScanDiff(diffs);
    } catch (err: any) {
      console.error('Vision analysis failed:', err);
      setErrorMsg(err.message || 'Vision analysis failed. Please try another image.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Cleanup on modal close or unmount
  useEffect(() => {
    if (isVisionScanModalOpen) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
      setErrorMsg(null);
    }
    return () => {
      stopCamera();
    };
  }, [isVisionScanModalOpen]);

  if (!isVisionScanModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">AI Vision Shelf-Counting Scanner</h3>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded font-mono font-semibold">
                  MULTIMODAL GEMINI
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Snap cooler shelves, bar liquor racks, or delivery boxes for automated stock reconciliation
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsVisionScanModalOpen(false)}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Storage Location & Model Selectors */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono uppercase">Zone:</span>
            {['Walk-In Cooler', 'Bar', 'Dry Prep', 'Freezer'].map((loc) => (
              <button
                key={loc}
                onClick={() => setSelectedLocation(loc)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  selectedLocation === loc
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {loc}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono uppercase">Model:</span>
            <select
              value={modelMode}
              onChange={(e) => setModelMode(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-sky-500"
            >
              <option value="auto">Auto-Switch (Adaptive)</option>
              <option value="gemini-3.8-flash">gemini-3.8-flash (Sub-Second)</option>
              <option value="gemini-4-argon">gemini-4-argon (Dense Shelves)</option>
            </select>
          </div>
        </div>

        {/* Viewfinder / Captured Image Area */}
        <div className="relative flex-1 bg-black min-h-[300px] flex items-center justify-center overflow-hidden">
          {capturedImage ? (
            <div className="relative w-full h-full flex items-center justify-center p-2">
              <img
                src={capturedImage}
                alt="Captured shelf"
                className="max-h-[380px] w-auto object-contain rounded-lg shadow-lg border border-slate-700"
              />
              <button
                onClick={() => {
                  setCapturedImage(null);
                  startCamera();
                }}
                className="absolute top-4 right-4 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-white rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1.5 backdrop-blur-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>
            </div>
          ) : isCameraActive ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full max-h-[420px] object-cover"
              />
              {/* Camera reticle overlay */}
              <div className="absolute inset-8 border-2 border-dashed border-sky-400/50 rounded-xl pointer-events-none flex flex-col justify-between p-4">
                <div className="flex justify-between text-[11px] font-mono text-sky-400/80 bg-slate-950/60 px-2 py-1 rounded w-fit">
                  TARGET: {selectedLocation.toUpperCase()} SHELVING
                </div>
                <div className="text-center text-xs text-sky-300 font-mono bg-slate-950/70 px-3 py-1 rounded-full mx-auto w-fit">
                  Frame items clearly with visible packaging labels
                </div>
              </div>

              {/* Torch Toggle in Viewfinder */}
              {torchSupported && (
                <button
                  onClick={toggleTorch}
                  className={`absolute top-4 left-4 p-2.5 rounded-full border transition-all backdrop-blur-md ${
                    isTorchOn
                      ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/30'
                      : 'bg-slate-900/70 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                  title={isTorchOn ? 'Flashlight On' : 'Flashlight Off'}
                >
                  <Flashlight className="w-5 h-5" />
                </button>
              )}
            </div>
          ) : (
            <div className="text-center p-8 max-w-md">
              <Camera className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">
                Live camera inactive. Select a sample cooler/bar shelf photo or upload an image file.
              </p>
              <button
                onClick={startCamera}
                className="mt-3 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold"
              >
                Start Live Camera
              </button>
            </div>
          )}

          {/* Hidden Canvas for Frame Capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Analyzing Overlay */}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
              <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 mb-4 animate-pulse">
                <Sparkles className="w-7 h-7 animate-spin" />
              </div>
              <h4 className="text-base font-bold text-white">Analyzing Shelf Units & Packaging...</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Multimodal Gemini is matching visible containers against the {selectedLocation} inventory catalog.
              </p>
              <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-sky-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Spatial reasoning in progress...</span>
              </div>
            </div>
          )}
        </div>

        {/* Error message if any */}
        {errorMsg && (
          <div className="px-5 py-2.5 bg-rose-500/20 border-t border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Sample Photo Presets Section */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90">
          <div className="text-[11px] font-mono uppercase text-slate-400 font-semibold mb-2.5 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
            <span>Test Scenarios & Shelf Presets (Click to Load)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {SHELF_SCAN_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className="bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700/60 hover:border-sky-500/60 rounded-xl p-2.5 text-left transition-all group"
              >
                <div className="text-xs font-semibold text-slate-200 group-hover:text-sky-300 truncate">
                  {preset.title.split(':')[1] || preset.title}
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{preset.storageLocation}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between gap-3">
          {/* File Upload Button */}
          <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors">
            <Upload className="w-4 h-4 text-slate-400" />
            <span>Upload Image</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>

          {/* Primary Action Button */}
          <div className="flex items-center gap-2">
            {isCameraActive && !capturedImage ? (
              <button
                onClick={captureFrame}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-600/30 flex items-center gap-2 transition-transform active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>Capture Frame</span>
              </button>
            ) : capturedImage ? (
              <button
                onClick={runVisionAnalysis}
                disabled={isAnalyzing}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Analyze Shelf & Reconcile</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
