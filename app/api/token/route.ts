import { NextRequest, NextResponse } from "next/server";
import { RtcRole, RtcTokenBuilder } from "agora-token";
import { getAgoraTokenConfig } from "@/lib/server/config";

export const runtime = "nodejs";

function generateToken(channelName: string, uid: number) {
  const cfg = getAgoraTokenConfig();
  const ttl = cfg.tokenTtlSeconds;

  const token = RtcTokenBuilder.buildTokenWithRtm2(
    cfg.appId,
    cfg.appCertificate,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    ttl,
    ttl,
    ttl,
    ttl,
    ttl,
    String(uid),
    ttl
  );

  return {
    token,
    appId: cfg.appId,
    botUid: cfg.botUid,
    uid,
    channelName,
    expiresInSeconds: ttl,
  };
}

export async function GET(req: NextRequest) {
  const channelName = req.nextUrl.searchParams.get("channelName")?.trim();
  const uidRaw = req.nextUrl.searchParams.get("uid");

  if (!channelName) {
    return NextResponse.json({ error: "channelName is required" }, { status: 400 });
  }

  const uid = uidRaw ? Number(uidRaw) : Math.floor(Math.random() * 10000) + 2000;
  if (!Number.isInteger(uid) || uid <= 0) {
    return NextResponse.json({ error: "uid must be a positive integer" }, { status: 400 });
  }

  return NextResponse.json(generateToken(channelName, uid));
}

export async function POST(req: NextRequest) {
  let body: { channelName?: string; uid?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const channelName = body?.channelName?.trim();
  const uidNum = body?.uid ? Number(body.uid) : undefined;

  if (!channelName) return NextResponse.json({ error: "channelName is required" }, { status: 400 });
  const uid = uidNum ?? Math.floor(Math.random() * 10000) + 2000;
  if (!Number.isInteger(uid) || uid <= 0)
    return NextResponse.json({ error: "uid must be a positive integer" }, { status: 400 });

  return NextResponse.json(generateToken(channelName, uid));
}