import { NextRequest, NextResponse } from "next/server";
import { RtcRole, RtcTokenBuilder } from "agora-token";
import { getConvoAiAgentConfig, getConvoAiRestConfig } from "@/lib/server/config";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are Sinta, an AI school document concierge. You help students access their official school documents—transcripts, certificates of enrollment, bank statements, school IDs, and more—all through voice conversation. You are warm, professional, and efficient. Reply in 1-3 spoken sentences.

YOUR CORE WORKFLOW:

1. IDENTIFY — Ask the student for their name and student ID number.
2. VERIFY — Use initiate_verification to start identity verification. Tell the student: "A verification window is opening on your screen. Please look at your camera or upload a photo to verify your identity."
3. CONFIRM — Use check_verification to confirm they passed. If not yet verified, ask them to complete it.
4. RETRIEVE — Use list_available_documents to show what's available. Use get_school_document to retrieve a specific document. Read out a brief summary.
5. DELIVER — Tell the student the document is ready to download on their screen.

SUPPORT:
- Use search_knowledge_base for FAQs about enrollment, grades, ID replacement, school hours, etc.
- Use create_support_ticket for issues requiring staff follow-up (missing documents, errors, complaints).
- Use request_identity_verification as a simpler fallback to trigger verification.
- Use search_documents and get_document_content for additional file retrieval if needed.

STRICT RULES:
- NEVER share ANY document content until verification is complete.
- If verification fails, offer to retry or create a support ticket. Never bypass.
- Keep responses concise and spoken naturally (1-3 sentences).
- When a document is ready, mention it's available for download on their screen.
- If you don't understand a request, ask clarifying questions.
- Be empathetic. Students may be stressed, frustrated, or in a hurry.
- Never say you are an AI or a chatbot. You are Sinta, a school document assistant.

DOCUMENT TYPES AVAILABLE:
- transcript: Official Transcript of Records with grades
- enrollment: Certificate of Enrollment with current subjects
- bank_statement: Financial/bank statement for the student account
- school_id: School ID card details

GREETING: On first interaction, introduce yourself: "Hi, I'm Sinta, your school document assistant. I can help you access your transcripts, enrollment certificates, bank statements, and more. What's your name and student ID?"`;

const GREETING = "Hi, I'm Sinta, your school document assistant. I can help you access your transcripts, enrollment certificates, bank statements, and more. What's your name and student ID?";

function getAuthHeader(id: string, secret: string): string {
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}

function buildJoinFailureReason(status: number, data: unknown): string {
  const msg = data && typeof data === "object" && "message" in data && typeof data.message === "string" ? data.message : null;
  if (status === 401) return "Agora rejected the Conversational AI REST credentials.";
  return msg ?? "Agent failed to start";
}

function summarizeAgentResponse(data: unknown) {
  if (!data || typeof data !== "object") return { type: typeof data };
  const r = data as Record<string, unknown>;
  return { keys: Object.keys(r), agentId: r.agent_id, status: r.status, message: r.message, detail: r.detail, traceId: r.trace_id };
}

function getMcpEndpoint(): string {
  const url = process.env.MCP_SERVER_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!url) return "";
  if (process.env.MCP_SERVER_URL) return `${process.env.MCP_SERVER_URL.replace(/\/+$/, "")}/api/mcp`;
  if (url.includes("localhost") || url.includes("127.0.0.1")) return "";
  return `${url.replace(/\/+$/, "")}/api/mcp`;
}

function buildTtsPayload(tts: ReturnType<typeof getConvoAiAgentConfig>["tts"]) {
  switch (tts.vendor) {
    case "microsoft":
      return { vendor: tts.vendor, params: { key: tts.key, region: tts.region, voice_name: tts.voiceName, speed: tts.speed, volume: tts.volume, sample_rate: tts.sampleRate } };
    case "elevenlabs":
      return { vendor: tts.vendor, params: { base_url: tts.baseUrl, key: tts.key, model_id: tts.modelId, voice_id: tts.voiceId, sample_rate: tts.sampleRate, speed: tts.speed, stability: tts.stability, similarity_boost: tts.similarityBoost, style: tts.style, use_speaker_boost: tts.useSpeakerBoost } };
    case "minimax":
      return { vendor: tts.vendor, params: { url: tts.url, key: tts.key, group_id: tts.groupId, model: tts.model, voice_setting: { voice_id: tts.voiceId.trim(), speed: tts.speed, vol: tts.volume, pitch: tts.pitch, emotion: tts.emotion }, sample_rate: tts.sampleRate } };
  }
}

export async function POST(req: NextRequest) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const channelName = typeof body?.channelName === "string" ? body.channelName.trim() : "";
  const userUid = Number(body?.uid);
  const skipJoin = body?.connect === false;

  if (!channelName) return NextResponse.json({ error: "channelName is required" }, { status: 400 });
  if (!Number.isInteger(userUid) || userUid <= 0) return NextResponse.json({ error: "uid must be a positive integer" }, { status: 400 });

  const restCfg = getConvoAiRestConfig();
  const agentCfg = getConvoAiAgentConfig();
  const botUid = restCfg.botUid;
  const agentRtmUid = `${botUid}-${channelName}`;
  const pipelineId = restCfg.pipelineId;

  if (skipJoin) {
    return NextResponse.json({ appId: restCfg.appId, channel: channelName, uid: userUid, agent: { uid: String(botUid) }, agentUid: String(botUid), agentRtmUid, userRtmUid: String(userUid) });
  }

  const botToken = RtcTokenBuilder.buildTokenWithRtm2(
    restCfg.appId, restCfg.appCertificate, channelName, botUid,
    RtcRole.PUBLISHER,
    restCfg.tokenTtlSeconds, restCfg.tokenTtlSeconds, restCfg.tokenTtlSeconds,
    restCfg.tokenTtlSeconds, restCfg.tokenTtlSeconds,
    String(botUid), restCfg.tokenTtlSeconds
  );

  const mcpEndpoint = getMcpEndpoint();
  const enableTools = !!mcpEndpoint;

  const llmConfig: Record<string, unknown> = {
    url: agentCfg.llm.url,
    api_key: agentCfg.llm.apiKey,
    style: agentCfg.llm.style,
    system_messages: [{ role: "system", content: SYSTEM_PROMPT }],
    greeting_message: GREETING,
    failure_message: "Sorry, I ran into an issue. Let me try that again.",
    greeting_configs: { mode: "single_every", delay_ms: 200, interruptable: true },
    max_history: 24,
    ignore_empty: true,
    params: { model: agentCfg.llm.model, max_output_tokens: 512, temperature: agentCfg.llm.temperature, top_p: agentCfg.llm.topP },
  };

  if (enableTools) {
    llmConfig.mcp_servers = [{ name: "sinta-tools", endpoint: mcpEndpoint, transport: "streamable_http", timeout_ms: 15000, allowed_tools: ["*"] }];
    llmConfig.tool_choice = "auto";
  }

  const requestBody: Record<string, unknown> = {
    name: `sinta-${channelName}`,
    properties: {
      channel: channelName,
      token: botToken,
      agent_rtc_uid: String(botUid),
      agent_rtm_uid: agentRtmUid,
      remote_rtc_uids: ["*"],
      advanced_features: { enable_rtm: true, enable_tools: enableTools },
      enable_string_uid: false,
      idle_timeout: 600,
      asr: { vendor: "ares", language: "en-US", task: "conversation" },
      llm: llmConfig,
      tts: buildTtsPayload(agentCfg.tts),
      parameters: {
        transcript: { enable: true, protocol_version: "v2", enable_words: false },
        enable_dump: true,
        enable_metrics: true,
        enable_error_message: true,
        data_channel: "rtm",
      },
      turn_detection: {
        config: {
          speech_threshold: 0.4,
          start_of_speech: { mode: "vad", vad_config: { interrupt_duration_ms: 120, prefix_padding_ms: 400 } },
          end_of_speech: { mode: "vad", vad_config: { silence_duration_ms: 480 } },
        },
      },
      interruption: { enable: true, mode: "start_of_speech" },
    },
  };

  if (pipelineId) {
    requestBody.pipeline_id = pipelineId;
  }

  try {
    const authHeader = getAuthHeader(restCfg.customerId, restCfg.customerSecret);
    const apiUrl = `${restCfg.convoAiBaseUrl}/${restCfg.appId}/join`;

    console.log("[start-agent] Sinta joining", {
      channelName, userUid, botUid, agentRtmUid,
      llmModel: agentCfg.llm.model,
      toolsEnabled: enableTools,
      mcpEndpoint: enableTools ? mcpEndpoint : "disabled",
      pipelineId: pipelineId || "none",
    });

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify(requestBody),
    });
    const data = await response.json();
    const debug = summarizeAgentResponse(data);

    console.log("[start-agent] join response", { httpStatus: response.status, ok: response.ok, debug });

    if (!response.ok) {
      return NextResponse.json(
        { ...data, debug, reason: buildJoinFailureReason(response.status, data) },
        { status: response.status }
      );
    }

    return NextResponse.json({ agentId: data.agent_id, channelName, botUid, agentRtmUid, debug });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Fetch Error", message: msg }, { status: 500 });
  }
}
