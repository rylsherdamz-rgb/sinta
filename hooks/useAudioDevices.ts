"use client";

import { useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";

export function useAudioDevices() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const refresh = async () => {
    try {
      const mics = await AgoraRTC.getMicrophones();
      setDevices(mics);
    } catch {
      setDevices([]);
    }
  };

  return { devices, refresh };
}