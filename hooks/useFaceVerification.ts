"use client";

import { useState, useCallback } from "react";

interface UseFaceVerificationProps {
  channelName?: string;
  onVerified?: (result: { verified: boolean; confidence: number; method: string; sessionId?: string }) => void;
}

export function useFaceVerification({ channelName, onVerified }: UseFaceVerificationProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    confidence: number;
    message: string;
    method: string;
    sessionId?: string;
  } | null>(null);

  const verify = useCallback(
    async (captured: string, mode: "face" | "id_card") => {
      if (!captured) return;
      setIsVerifying(true);
      setVerificationResult(null);
      try {
        const body: Record<string, unknown> = { method: mode, channelName };
        if (mode === "face") body.faceData = captured;
        else body.idData = captured;

        const res = await fetch("/api/face/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        setVerificationResult(data);
        if (data.verified && onVerified) {
          setTimeout(() => onVerified(data), 600);
        }
      } catch {
        setVerificationResult({
          verified: false,
          confidence: 0,
          message: "Verification service unavailable. Please try again.",
          method: mode,
        });
      } finally {
        setIsVerifying(false);
      }
    },
    [channelName, onVerified]
  );

  const reset = useCallback(() => {
    setIsVerifying(false);
    setVerificationResult(null);
  }, []);

  return { isVerifying, verificationResult, verify, reset };
}
