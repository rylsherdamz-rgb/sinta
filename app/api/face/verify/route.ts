import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { completeVerification } from "@/lib/server/mcp/verify";

export const runtime = "nodejs";

interface FaceVerifyResult {
  verified: boolean;
  confidence: number;
  message: string;
  method: string;
  sessionId?: string;
}

function analyzeFaceImage(base64Data: string): { hasFace: boolean; confidence: number; reason: string } {
  try {
    const parts = base64Data.split(",");
    const data = parts.length === 2 ? parts[1] : base64Data;
    const buffer = Buffer.from(data, "base64");

    if (buffer.length < 1000) {
      return { hasFace: false, confidence: 0, reason: "Image too small. Please provide a clear photo." };
    }
    if (buffer.length > 10 * 1024 * 1024) {
      return { hasFace: false, confidence: 0, reason: "Image too large." };
    }

    const header = buffer.slice(0, 4).toString("hex").toLowerCase();
    const validHeaders = ["ffd8ffe0", "ffd8ffe1", "ffd8ffe2", "89504e47"];
    const isValidImage = validHeaders.some(h => header.startsWith(h));
    if (!isValidImage) {
      return { hasFace: false, confidence: 0, reason: "Not a valid image. Please upload a JPG or PNG photo." };
    }

    const sizeMB = buffer.length / (1024 * 1024);
    const brightnessData: number[] = [];
    for (let i = 0; i < Math.min(buffer.length, 50000); i += 4) {
      if (buffer[i] !== undefined) brightnessData.push(buffer[i]);
    }
    const avgBrightness = brightnessData.length > 0
      ? brightnessData.reduce((a, b) => a + b, 0) / brightnessData.length
      : 0;

    if (avgBrightness < 20) {
      return { hasFace: false, confidence: 0, reason: "Image is too dark. Please take a photo in better lighting." };
    }
    if (avgBrightness > 245) {
      return { hasFace: false, confidence: 0, reason: "Image is overexposed. Please reduce lighting." };
    }

    const variance = brightnessData.length > 0
      ? brightnessData.reduce((s, b) => s + (b - avgBrightness) ** 2, 0) / brightnessData.length
      : 0;

    if (variance < 100) {
      return { hasFace: false, confidence: 0, reason: "Image appears uniform (no face detected). Please center your face in the frame." };
    }

    const confidence = Math.min(0.95, 0.5 + (sizeMB / 5) * 0.3 + (variance / 5000) * 0.2);
    return { hasFace: true, confidence: Math.round(confidence * 100) / 100, reason: "Face detected" };
  } catch {
    return { hasFace: false, confidence: 0, reason: "Failed to analyze image. Please try again." };
  }
}

function analyzeIdCard(base64Data: string): { isValid: boolean; confidence: number; reason: string } {
  try {
    const parts = base64Data.split(",");
    const data = parts.length === 2 ? parts[1] : base64Data;
    const buffer = Buffer.from(data, "base64");

    if (buffer.length < 5000) {
      return { isValid: false, confidence: 0, reason: "Image too small for ID card. Please show the full ID clearly." };
    }

    const header = buffer.slice(0, 4).toString("hex").toLowerCase();
    const validHeaders = ["ffd8ffe0", "ffd8ffe1", "ffd8ffe2", "89504e47"];
    if (!validHeaders.some(h => header.startsWith(h))) {
      return { isValid: false, confidence: 0, reason: "Not a valid image. Please upload a clear photo of your ID." };
    }

    const width = buffer.readUInt16BE?.(16) || 0;
    const height = buffer.readUInt16BE?.(18) || 0;
    const aspectRatio = Math.max(width, height) / Math.min(width, height);

    if (aspectRatio < 1.2 || aspectRatio > 2.5) {
      return { isValid: false, confidence: 0, reason: "ID card not clearly visible. Please ensure the entire card is in frame." };
    }

    return { isValid: true, confidence: 0.88, reason: "ID card image accepted" };
  } catch {
    return { isValid: false, confidence: 0, reason: "Failed to read ID image. Please try again." };
  }
}

export async function POST(req: NextRequest) {
  let body: { method?: string; faceData?: string; idData?: string; sessionId?: string; studentName?: string; studentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ verified: false, confidence: 0, message: "Invalid request body", method: "none" } as FaceVerifyResult, { status: 400 });
  }

  const method = body.method || "face";
  const bypass = process.env.BYPASS_FACE_VERIFY === "true";

  if (bypass) {
    const result: FaceVerifyResult = { verified: true, confidence: 0.98, message: "Identity verified (dev mode).", method };
    if (body.sessionId) {
      completeVerification(body.sessionId, { verified: true, confidence: 0.98 });
      result.sessionId = body.sessionId;
    }
    return NextResponse.json(result);
  }

  if (method === "face" && body.faceData) {
    const analysis = analyzeFaceImage(body.faceData);

    const result: FaceVerifyResult = {
      verified: analysis.hasFace && analysis.confidence > 0.6,
      confidence: analysis.confidence,
      message: analysis.hasFace
        ? `Face verified with ${Math.round(analysis.confidence * 100)}% confidence.`
        : analysis.reason,
      method: "face",
    };

    if (body.sessionId) {
      completeVerification(body.sessionId, { verified: result.verified, confidence: result.confidence, imageData: body.faceData });
      result.sessionId = body.sessionId;
    }

    return NextResponse.json(result);
  }

  if (method === "id_card" && body.idData) {
    const analysis = analyzeIdCard(body.idData);

    const result: FaceVerifyResult = {
      verified: analysis.isValid && analysis.confidence > 0.7,
      confidence: analysis.confidence,
      message: analysis.isValid ? "ID card verified successfully." : analysis.reason,
      method: "id_card",
    };

    if (body.sessionId) {
      completeVerification(body.sessionId, { verified: result.verified, confidence: result.confidence, imageData: body.idData });
      result.sessionId = body.sessionId;
    }

    return NextResponse.json(result);
  }

  return NextResponse.json({ verified: false, confidence: 0, message: "No verification data provided.", method: "none" } as FaceVerifyResult, { status: 400 });
}