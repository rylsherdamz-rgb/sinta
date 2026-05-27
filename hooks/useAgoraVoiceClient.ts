"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import AgoraRTC, {
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
  IAgoraRTCRemoteUser,
  IAgoraRTCClient,
} from "agora-rtc-sdk-ng";
import AgoraRTM from "agora-rtm";
import {
  AgoraVoiceAI,
  AgoraVoiceAIEvents,
  TurnStatus,
  TranscriptHelperMode,
  ChatMessageType,
  ChatMessagePriority,
  type TranscriptHelperItem,
} from "agora-agent-client-toolkit";

export type VoiceClientConfig = {
  appId: string;
  channel: string;
  token: string | null;
  uid: number;
  rtmUid?: string;
  agentUid?: string;
  agentRtmUid?: string;
  microphoneId?: string;
};

export interface IMessageListItem {
  turn_id: number;
  uid: string;
  text: string;
  status: number;
  timestamp?: number;
}

export function useAgoraVoiceClient() {
  const [localAudioTrack, setLocalAudioTrack] =
    useState<IMicrophoneAudioTrack | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messageList, setMessageList] = useState<IMessageListItem[]>([]);
  const [currentInProgressMessage, setCurrentInProgressMessage] =
    useState<IMessageListItem | null>(null);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [agentUid, setAgentUid] = useState<string | undefined>(undefined);
  const [agentRtmUid, setAgentRtmUid] = useState<string | undefined>(undefined);
  const [remoteAudioTrack, setRemoteAudioTrack] =
    useState<IRemoteAudioTrack | null>(null);

  const rtcClientRef = useRef<IAgoraRTCClient | null>(null);
  const rtmClientRef = useRef<InstanceType<typeof AgoraRTM.RTM> | null>(null);
  const voiceAIRef = useRef<AgoraVoiceAI | null>(null);
  const volumeCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const rtcClient = rtcClientRef.current;
    if (!rtcClient) return;

    const handleUserPublished = async (
      user: IAgoraRTCRemoteUser,
      mediaType: "audio" | "video",
    ) => {
      if (mediaType === "audio") {
        await rtcClient.subscribe(user, mediaType);
        user.audioTrack?.play();
        setRemoteAudioTrack(user.audioTrack ?? null);
        setIsAgentSpeaking(true);
      }
    };

    const handleUserUnpublished = (
      _user: IAgoraRTCRemoteUser,
      mediaType: "audio" | "video",
    ) => {
      if (mediaType === "audio") {
        setIsAgentSpeaking(false);
        setRemoteAudioTrack(null);
      }
    };

    const handleUserLeft = () => {
      setIsAgentSpeaking(false);
      setRemoteAudioTrack(null);
    };

    rtcClient.on("user-published", handleUserPublished);
    rtcClient.on("user-unpublished", handleUserUnpublished);
    rtcClient.on("user-left", handleUserLeft);

    return () => {
      rtcClient.off("user-published", handleUserPublished);
      rtcClient.off("user-unpublished", handleUserUnpublished);
      rtcClient.off("user-left", handleUserLeft);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rtcClientRef.current]);

  useEffect(() => {
    if (!remoteAudioTrack) {
      if (volumeCheckIntervalRef.current) {
        clearInterval(volumeCheckIntervalRef.current);
        volumeCheckIntervalRef.current = null;
      }
      return;
    }

    const volumes: number[] = [];
    volumeCheckIntervalRef.current = setInterval(() => {
      if (
        remoteAudioTrack &&
        typeof remoteAudioTrack.getVolumeLevel === "function"
      ) {
        const volume = remoteAudioTrack.getVolumeLevel();
        volumes.push(volume);
        if (volumes.length > 3) volumes.shift();

        const isAllZero = volumes.length >= 2 && volumes.every((v) => v === 0);
        const hasSound = volumes.length >= 2 && volumes.some((v) => v > 0);

        if (isAllZero && isAgentSpeaking) {
          setIsAgentSpeaking(false);
        } else if (hasSound && !isAgentSpeaking) {
          setIsAgentSpeaking(true);
        }
      }
    }, 100);

    return () => {
      if (volumeCheckIntervalRef.current) {
        clearInterval(volumeCheckIntervalRef.current);
        volumeCheckIntervalRef.current = null;
      }
    };
  }, [remoteAudioTrack, isAgentSpeaking]);

  const leaveChannel = useCallback(async () => {
    try {
      if (voiceAIRef.current) {
        voiceAIRef.current.unsubscribe();
        voiceAIRef.current.destroy();
        voiceAIRef.current = null;
      }

      if (rtmClientRef.current) {
        await rtmClientRef.current.logout();
        rtmClientRef.current = null;
      }

      if (rtcClientRef.current) {
        await rtcClientRef.current.leave();
        rtcClientRef.current = null;
      }

      setLocalAudioTrack(null);
      setIsConnected(false);
      setIsAgentSpeaking(false);
      setMessageList([]);
      setCurrentInProgressMessage(null);
    } catch (error) {
      console.error("Error leaving channel:", error);
    }
  }, []);

  const joinChannel = useCallback(
    async (config: VoiceClientConfig) => {
      if (isConnected) {
        await leaveChannel();
      }

      try {
        if (config.agentUid) setAgentUid(config.agentUid);
        if (config.agentRtmUid) setAgentRtmUid(config.agentRtmUid);

        const rtcClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        rtcClientRef.current = rtcClient;

        const rtmUid = config.rtmUid || `${config.uid}`;
        const rtmClient = new AgoraRTM.RTM(config.appId, rtmUid);
        rtmClientRef.current = rtmClient;

        const voiceAI = await AgoraVoiceAI.init({
          rtcEngine: rtcClient,
          rtmConfig: { rtmEngine: rtmClient },
          renderMode: TranscriptHelperMode.TEXT,
          enableLog: false,
        });

        voiceAI.on(
          AgoraVoiceAIEvents.TRANSCRIPT_UPDATED,
          (messages: TranscriptHelperItem[]) => {
            const fixSpacing = (t: string) =>
              t.replace(/([.!?,:;])([A-Za-z])/g, "$1 $2");
            const convertedMessages = messages.map((m) => ({
              turn_id: m.turn_id,
              uid: m.uid,
              text: fixSpacing(m.text),
              status: m.status,
              timestamp: m.timestamp,
            }));

            const completedMessages = convertedMessages
              .filter((msg) => msg.status !== TurnStatus.IN_PROGRESS)
              .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

            const inProgress = convertedMessages.find(
              (msg) => msg.status === TurnStatus.IN_PROGRESS,
            );

            setMessageList(completedMessages);
            setCurrentInProgressMessage(inProgress || null);
          },
        );

        voiceAIRef.current = voiceAI;

        try {
          await rtmClient.login({ token: config.token ?? undefined });
          await rtmClient.subscribe(config.channel, { withMessage: true });
          voiceAI.subscribeMessage(config.channel);
        } catch (rtmErr) {
          console.warn("[useAgoraVoiceClient] RTM login failed — continuing with voice only. Enable RTM in Agora Console for transcripts.", rtmErr);
        }

        await rtcClient.join(
          config.appId,
          config.channel,
          config.token,
          config.uid,
        );

        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: "high_quality_stereo",
          AEC: true,
          ANS: true,
          AGC: true,
          ...(config.microphoneId
            ? { microphoneId: config.microphoneId }
            : {}),
        });
        await rtcClient.publish([audioTrack]);

        setLocalAudioTrack(audioTrack);
        setIsConnected(true);
      } catch (error) {
        console.error("Error joining channel:", error);
        throw error;
      }
    },
    [isConnected, leaveChannel],
  );

  const toggleMute = useCallback(async () => {
    const track = localAudioTrack;
    if (!track) return;

    try {
      await track.setEnabled(isMuted);
      setIsMuted(!isMuted);
    } catch (error) {
      console.error("Error toggling mute:", error);
    }
  }, [isMuted, localAudioTrack]);

  const sendMessage = useCallback(
    async (message: string, targetUid?: string) => {
      const voiceAI = voiceAIRef.current;
      if (!voiceAI) {
        console.error("Cannot send message: AgoraVoiceAI not initialized");
        return false;
      }

      const uid = targetUid || agentRtmUid;
      if (!uid) {
        console.error("Cannot send message: no agent RTM UID available");
        return false;
      }

      try {
        await voiceAI.chat(uid, {
          messageType: ChatMessageType.TEXT,
          text: message,
          priority: ChatMessagePriority.INTERRUPTED,
          responseInterruptable: true,
        });
        return true;
      } catch (error) {
        console.error("Error sending message:", error);
        return false;
      }
    },
    [agentRtmUid],
  );

  return {
    isConnected,
    isMuted,
    messageList,
    currentInProgressMessage,
    isAgentSpeaking,
    localAudioTrack,
    joinChannel,
    leaveChannel,
    toggleMute,
    sendMessage,
    agentUid,
    rtmClientRef,
  };
}