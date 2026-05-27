"use client";

import { useEffect, useRef, useState } from "react";
import type { IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";

export function useAudioVisualization(
  audioTrack: IMicrophoneAudioTrack | null,
  active: boolean,
) {
  const [frequencyData, setFrequencyData] = useState<number[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!audioTrack || !active) {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFrequencyData([]);
      return;
    }

    const mediaStreamTrack = audioTrack.getMediaStreamTrack();
    if (!mediaStreamTrack) return;

    let disposed = false;

    const setup = async () => {
      try {
        const stream = new MediaStream([mediaStreamTrack]);
        const audioCtx = new AudioContext();
        audioContextRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const update = () => {
          if (disposed) return;
          analyser.getByteFrequencyData(dataArray);
          const values = Array.from(dataArray).map((v) => v / 255);
          setFrequencyData(values);
          animationFrameRef.current = requestAnimationFrame(update);
        };
        update();
      } catch {
        // mic permission denied or already in use
      }
    };

    setup();

    return () => {
      disposed = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [audioTrack, active]);

  return frequencyData;
}