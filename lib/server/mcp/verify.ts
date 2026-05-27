import { getDb } from "@/lib/server/db";
import { v4 as uuid } from "uuid";

export interface VerificationSession {
  id: string;
  channel_name: string;
  student_name: string | null;
  student_id: string | null;
  status: string;
  method: string;
  confidence: number | null;
  image_data: string | null;
  created_at: number;
  completed_at: number | null;
}

export function createVerificationSession(params: {
  channelName: string;
  studentName?: string;
  studentId?: string;
}): VerificationSession {
  const db = getDb();
  const now = Date.now();
  const session: VerificationSession = {
    id: uuid(),
    channel_name: params.channelName,
    student_name: params.studentName || null,
    student_id: params.studentId || null,
    status: "pending",
    method: "face",
    confidence: null,
    image_data: null,
    created_at: now,
    completed_at: null,
  };

  db.prepare(`
    INSERT INTO verification_sessions (id, channel_name, student_name, student_id, status, method, confidence, image_data, created_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(session.id, session.channel_name, session.student_name, session.student_id, session.status, session.method, session.confidence, session.image_data, session.created_at, session.completed_at);

  return session;
}

export function getVerificationSession(sessionId: string): VerificationSession | null {
  const db = getDb();
  return (db.prepare("SELECT * FROM verification_sessions WHERE id = ?").get(sessionId) as VerificationSession) || null;
}

export function getVerificationByChannel(channelName: string): VerificationSession | null {
  const db = getDb();
  return (db.prepare("SELECT * FROM verification_sessions WHERE channel_name = ? ORDER BY created_at DESC LIMIT 1").get(channelName) as VerificationSession) || null;
}

export function completeVerification(sessionId: string, data: { verified: boolean; confidence: number; imageData?: string }): VerificationSession | null {
  const db = getDb();
  const now = Date.now();
  db.prepare(`
    UPDATE verification_sessions SET status = ?, confidence = ?, image_data = ?, completed_at = ? WHERE id = ?
  `).run(data.verified ? "verified" : "failed", data.confidence, data.imageData || null, now, sessionId);
  return getVerificationSession(sessionId);
}