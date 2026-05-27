import { envNumber, optionalEnv, requireEnv } from "@/lib/server/env";

export type TtsVendor = "microsoft" | "elevenlabs" | "minimax";

export type AgoraTokenConfig = {
  appId: string;
  appCertificate: string;
  botUid: number;
  tokenTtlSeconds: number;
};

export type ConvoAiRestConfig = AgoraTokenConfig & {
  customerId: string;
  customerSecret: string;
  convoAiBaseUrl: string;
  pipelineId?: string;
};

function requireFirstEnv(...names: string[]): string {
  for (const name of names) {
    const value = optionalEnv(name);
    if (value) {
      return value;
    }
  }

  throw new Error(`Missing environment variable: one of ${names.join(", ")}`);
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export type LlmStyle = "openai" | "gemini" | "anthropic" | "dify";

export type LlmConfig = {
  apiKey: string;
  model: string;
  url: string;
  style: LlmStyle;
  maxTokens: number;
  temperature: number;
  topP: number;
};

export type MicrosoftTtsConfig = {
  vendor: "microsoft";
  key: string;
  region: string;
  voiceName: string;
  speed: number;
  volume: number;
  sampleRate: number;
};

export type ElevenLabsTtsConfig = {
  vendor: "elevenlabs";
  key: string;
  baseUrl: string;
  modelId: string;
  voiceId: string;
  sampleRate: number;
  speed?: number;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
};

export type MiniMaxTtsConfig = {
  vendor: "minimax";
  key: string;
  model: string;
  url: string;
  voiceId: string;
  speed: number;
  volume: number;
  pitch: number;
  emotion: string;
  sampleRate: number;
  groupId?: string;
};

export type TtsConfig = MicrosoftTtsConfig | ElevenLabsTtsConfig | MiniMaxTtsConfig;

export type ConvoAiAgentConfig = {
  llm: LlmConfig;
  tts: TtsConfig;
};

export function getAgoraTokenConfig(): AgoraTokenConfig {
  const appId = requireEnv("NEXT_PUBLIC_AGORA_APP_ID");
  const appCertificate = requireEnv("AGORA_APP_CERTIFICATE");

  return {
    appId,
    appCertificate,
    botUid: envNumber("NEXT_PUBLIC_AGORA_BOT_UID", 1001),
    tokenTtlSeconds: envNumber("AGORA_TOKEN_TTL_SECONDS", 3600),
  };
}

export function getConvoAiRestConfig(): ConvoAiRestConfig {
  const base = getAgoraTokenConfig();
  return {
    ...base,
    customerId: requireFirstEnv("AGORA_CUSTOMER_ID", "AGORA_CUSTOMER_KEY", "AGORA_REST_KEY"),
    customerSecret: requireFirstEnv("AGORA_CUSTOMER_SECRET", "AGORA_REST_SECRET"),
    convoAiBaseUrl: normalizeBaseUrl(
      optionalEnv("AGORA_CONVO_AI_BASE_URL") ??
      "https://api.agora.io/api/conversational-ai-agent/v2/projects"
    ),
    pipelineId: optionalEnv("AGORA_PIPELINE_ID"),
  };
}

export function getConvoAiAgentConfig(): ConvoAiAgentConfig {
  const llmApiKey =
    optionalEnv("LLM_API_KEY")?.trim() ??
    optionalEnv("GEMINI_API_KEY")?.trim() ??
    optionalEnv("GOOGLE_API_KEY")?.trim() ??
    "";
  const llmModel = (optionalEnv("LLM_MODEL") ?? optionalEnv("GEMINI_MODEL") ?? "deepseek-ai/deepseek-v4-pro").trim();
  const llmStyle = (optionalEnv("LLM_STYLE") ?? "openai").trim().toLowerCase() as LlmStyle;

  const rawLlmUrl = optionalEnv("LLM_URL")?.trim();
  const llmUrl = rawLlmUrl ? rawLlmUrl : "";

  const llm: LlmConfig = {
    apiKey: llmApiKey,
    model: llmModel,
    url: llmUrl,
    style: llmStyle,
    maxTokens: envNumber("LLM_MAX_TOKENS", 2048),
    temperature: envNumber("LLM_TEMPERATURE", 0.6),
    topP: envNumber("LLM_TOP_P", 0.9),
  };

  const ttsVendor = (optionalEnv("TTS_VENDOR") ?? "minimax").trim().toLowerCase() as TtsVendor;
  let tts: TtsConfig;

  switch (ttsVendor) {
    case "microsoft":
      tts = {
        vendor: "microsoft",
        key: requireEnv("MICROSOFT_TTS_KEY").trim(),
        region: requireEnv("MICROSOFT_TTS_REGION").trim(),
        voiceName: requireEnv("MICROSOFT_TTS_VOICE_NAME").trim(),
        speed: envNumber("MICROSOFT_TTS_RATE", 1.0),
        volume: envNumber("MICROSOFT_TTS_VOLUME", 100.0),
        sampleRate: envNumber("MICROSOFT_TTS_SAMPLE_RATE", 24000),
      };
      break;
    case "elevenlabs":
      tts = {
        vendor: "elevenlabs",
        key: requireEnv("ELEVENLABS_API_KEY").trim(),
        baseUrl: (optionalEnv("ELEVENLABS_BASE_URL") ?? "wss://api.elevenlabs.io/v1").trim(),
        modelId: (optionalEnv("ELEVENLABS_MODEL_ID") ?? "eleven_flash_v2_5").trim(),
        voiceId: (optionalEnv("ELEVENLABS_VOICE_ID") ?? "pNInz6obpgDQGcFmaJgB").trim(),
        sampleRate: envNumber("ELEVENLABS_SAMPLE_RATE", 24000),
        speed: optionalEnv("ELEVENLABS_SPEED") ? envNumber("ELEVENLABS_SPEED") : undefined,
        stability: optionalEnv("ELEVENLABS_STABILITY") ? envNumber("ELEVENLABS_STABILITY") : undefined,
        similarityBoost: optionalEnv("ELEVENLABS_SIMILARITY_BOOST")
          ? envNumber("ELEVENLABS_SIMILARITY_BOOST")
          : undefined,
        style: optionalEnv("ELEVENLABS_STYLE") ? envNumber("ELEVENLABS_STYLE") : undefined,
        useSpeakerBoost: optionalEnv("ELEVENLABS_USE_SPEAKER_BOOST")
          ? optionalEnv("ELEVENLABS_USE_SPEAKER_BOOST") === "true"
          : undefined,
      };
      break;
    case "minimax":
      tts = {
        vendor: "minimax",
        key: requireEnv("MINIMAX_TTS_KEY").trim(),
        model: (optionalEnv("MINIMAX_TTS_MODEL") ?? "speech-02-turbo").trim(),
        url: (optionalEnv("MINIMAX_TTS_URL") ?? "wss://api-uw.minimax.io/ws/v1/t2a_v2").trim(),
        voiceId: requireEnv("MINIMAX_TTS_VOICE_ID").trim(),
        speed: envNumber("MINIMAX_TTS_SPEED", 1.0),
        volume: envNumber("MINIMAX_TTS_VOLUME", 1.0),
        pitch: envNumber("MINIMAX_TTS_PITCH", 0),
        emotion: (optionalEnv("MINIMAX_TTS_EMOTION") ?? "neutral").trim(),
        sampleRate: envNumber("MINIMAX_TTS_SAMPLE_RATE", 48000),
        groupId: optionalEnv("MINIMAX_TTS_GROUP_ID")?.trim() ?? optionalEnv("MINIMAX_GROUP_ID")?.trim(),
      };
      break;
    default:
      throw new Error(`Unsupported TTS_VENDOR: ${ttsVendor}`);
  }

  return { llm, tts };
}
