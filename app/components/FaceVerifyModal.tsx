"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Camera, X, Check, Shield, Upload, RefreshCw, Image as ImageIcon, User, FileCheck } from "lucide-react";

interface FaceVerifyModalProps {
  open: boolean;
  onClose: () => void;
  onVerified: (result: { verified: boolean; confidence: number; method: string; sessionId?: string }) => void;
  channelName?: string;
}

export default function FaceVerifyModal({ open, onClose, onVerified, channelName }: FaceVerifyModalProps) {
  const [mode, setMode] = useState<"select" | "face_camera" | "face_upload" | "id_upload">("select");
  const [captured, setCaptured] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<{ verified: boolean; confidence: number; message: string; method: string; sessionId?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch { setErrorMsg("Camera access denied. Please allow camera permission or use upload instead."); }
  }, []);

  useEffect(() => { return () => stopCamera(); }, [stopCamera]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    setCaptured(canvas.toDataURL("image/jpeg", 0.8));
    stopCamera();
  }, [stopCamera]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    if (file.size > 10 * 1024 * 1024) { setErrorMsg("File too large. Max 10MB."); return; }
    if (!file.type.startsWith("image/")) { setErrorMsg("Please upload an image file (JPG, PNG)."); return; }
    const reader = new FileReader();
    reader.onload = () => setCaptured(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const verify = useCallback(async () => {
    if (!captured) return;
    setVerifying(true);
    setErrorMsg(null);
    try {
      const method = mode === "id_upload" ? "id_card" : "face";
      const body: Record<string, unknown> = { method, channelName };
      if (method === "face") body.faceData = captured;
      else body.idData = captured;

      const res = await fetch("/api/face/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setResult(data);
      if (data.verified) {
        setTimeout(() => onVerified(data), 800);
      }
    } catch {
      setResult({ verified: false, confidence: 0, message: "Verification service unavailable. Please try again.", method: mode });
    } finally {
      setVerifying(false);
    }
  }, [captured, mode, onVerified, channelName]);

  const reset = () => { stopCamera(); setMode("select"); setCaptured(null); setResult(null); setErrorMsg(null); setVerifying(false); };
  const handleClose = () => { stopCamera(); reset(); onClose(); };

  const selectMode = (m: "face_camera" | "face_upload" | "id_upload") => { setMode(m); setCaptured(null); setResult(null); setErrorMsg(null); if (m === "face_camera") startCamera(); };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#0a0a0f] border border-white/[0.06] rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-5 border-b border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Shield size={14} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Identity Verification</h2>
              <p className="text-[10px] text-white/30">Sinta needs to confirm it's you</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors">
            <X size={16} className="text-white/30" />
          </button>
        </div>

        <div className="p-5">
          {mode === "select" && (
            <div className="space-y-4">
              <p className="text-xs text-white/30 text-center">Choose how you want to verify</p>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => selectMode("face_camera")} className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] hover:border-indigo-500/30 hover:bg-white/[0.02] transition-all text-left">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0"><Camera size={18} className="text-indigo-400" /></div>
                  <div><p className="text-xs font-semibold text-white/80">Take a Selfie</p><p className="text-[10px] text-white/30">Use your camera for instant face verification</p></div>
                </button>
                <button onClick={() => selectMode("face_upload")} className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] hover:border-emerald-500/30 hover:bg-white/[0.02] transition-all text-left">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0"><ImageIcon size={18} className="text-emerald-400" /></div>
                  <div><p className="text-xs font-semibold text-white/80">Upload a Photo</p><p className="text-[10px] text-white/30">Upload a clear photo of yourself</p></div>
                </button>
                <button onClick={() => selectMode("id_upload")} className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] hover:border-amber-500/30 hover:bg-white/[0.02] transition-all text-left">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0"><FileCheck size={18} className="text-amber-400" /></div>
                  <div><p className="text-xs font-semibold text-white/80">Upload School ID</p><p className="text-[10px] text-white/30">Verify with your school ID card</p></div>
                </button>
              </div>
            </div>
          )}

          {mode !== "select" && !result && (
            <div className="space-y-4">
              {mode === "face_camera" && (
                <>
                  <div className="relative rounded-2xl overflow-hidden bg-black/60 aspect-video">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    {captured && <img src={captured} alt="Captured" className="absolute inset-0 w-full h-full object-cover" />}
                    {!captured && <div className="absolute inset-0 border-2 border-indigo-400/20 rounded-2xl m-4 pointer-events-none" />}
                    {!captured && <p className="absolute bottom-3 left-0 right-0 text-center text-[10px] text-white/20">Center your face and look at the camera</p>}
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                </>
              )}
              {(mode === "face_upload" || mode === "id_upload") && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative rounded-2xl overflow-hidden border-2 border-dashed cursor-pointer transition-all ${captured ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/[0.08] hover:border-white/[0.15] bg-black/40"} aspect-video flex items-center justify-center`}
                >
                  {captured ? (
                    <img src={captured} alt="Uploaded" className="absolute inset-0 w-full h-full object-contain p-2" />
                  ) : (
                    <div className="text-center space-y-2">
                      <Upload size={28} className="mx-auto text-white/15" />
                      <p className="text-xs text-white/20">{mode === "face_upload" ? "Click to upload a photo" : "Click to upload your school ID"}</p>
                      <p className="text-[10px] text-white/10">JPG or PNG, max 10MB</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileUpload} className="hidden" />
                </div>
              )}

              {errorMsg && <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-[11px] text-red-400 text-center">{errorMsg}</div>}

              {!captured ? (
                <button onClick={mode === "face_camera" ? capture : undefined} className="w-full py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/50 text-sm font-medium hover:bg-white/[0.05] transition-all">
                  {mode === "face_camera" ? <><Camera size={14} className="inline mr-1.5" />Capture Photo</> : <><Upload size={14} className="inline mr-1.5" />Select File</>}
                </button>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => { setCaptured(null); setErrorMsg(null); if (mode === "face_camera") startCamera(); }} className="flex-1 py-3 rounded-xl border border-white/[0.06] text-white/40 text-sm font-medium hover:bg-white/[0.02] transition-all">
                    <RefreshCw size={13} className="inline mr-1.5" />Retake
                  </button>
                  <button onClick={verify} disabled={verifying} className="flex-1 py-3 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 disabled:opacity-40 transition-all active:scale-[0.98]">
                    {verifying ? <><span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />Verifying...</> : <><Check size={14} className="inline mr-1.5" />Verify</>}
                  </button>
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="space-y-4 text-center py-3">
              <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${result.verified ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                {result.verified ? <Check size={26} className="text-emerald-400" /> : <X size={26} className="text-red-400" />}
              </div>
              <div>
                <p className={`text-sm font-semibold ${result.verified ? "text-emerald-400" : "text-red-400"}`}>
                  {result.verified ? "Identity Verified" : "Verification Failed"}
                </p>
                <p className="text-xs text-white/40 mt-1.5 leading-relaxed max-w-xs mx-auto">{result.message}</p>
                {result.confidence > 0 && <p className="text-[10px] text-white/20 mt-1">Confidence: {Math.round(result.confidence * 100)}%</p>}
              </div>
              <button onClick={handleClose} className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${result.verified ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25" : "bg-white/[0.02] border border-white/[0.05] text-white/40 hover:bg-white/[0.04]"}`}>
                {result.verified ? "Continue" : "Try Again"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}