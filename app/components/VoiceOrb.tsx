"use client";

import { useEffect, useRef } from "react";

export type AgentState = "idle" | "listening" | "thinking" | "speaking" | "error" | "tool_calling";

interface VoiceOrbProps {
  state: AgentState;
  onClick?: () => void;
  size?: number;
}

const palette: Record<AgentState, string> = {
  idle: "#4f46e5",
  listening: "#3b82f6",
  thinking: "#f59e0b",
  speaking: "#10b981",
  error: "#ef4444",
  tool_calling: "#8b5cf6",
};

const labels: Record<AgentState, string> = {
  idle: "Tap to Start",
  listening: "Listening...",
  thinking: "Processing...",
  speaking: "Responding...",
  error: "Connection Error",
  tool_calling: "Fetching Info...",
};

export default function VoiceOrb({ state, onClick, size = 200 }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useRef(0);
  const t = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.22;
    const color = palette[state];

    const draw = () => {
      if (!ctx || !canvas) return;
      t.current += 0.016;

      ctx.clearRect(0, 0, size, size);

      // Outer glow
      const glow = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.7);
      glow.addColorStop(0, color + "14");
      glow.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.7, 0, Math.PI * 2);
      ctx.fillStyle = glow; ctx.fill();

      // State effects
      if (state === "listening") {
        for (let i = 3; i >= 1; i--) {
          const phase = t.current * 0.8 + i;
          const s = Math.sin(phase) * 0.5 + 0.5;
          ctx.beginPath();
          ctx.arc(cx, cy, r + i * 11 + s * 16, 0, Math.PI * 2);
          ctx.strokeStyle = color + `${Math.floor(s * 20 + 2).toString(16)}`;
          ctx.lineWidth = 1.2; ctx.stroke();
        }
      }

      if (state === "thinking") {
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + t.current * 1.4;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * (r + 10), cy + Math.sin(a) * (r + 10), 2, 0, Math.PI * 2);
          ctx.fillStyle = color + Math.floor(60 + Math.sin(t.current * 4 + i) * 30).toString(16);
          ctx.fill();
        }
      }

      if (state === "speaking") {
        for (let i = 0; i < 4; i++) {
          const h = 6 + Math.abs(Math.sin(t.current * 3.5 + i * 0.8)) * 20;
          ctx.beginPath();
          ctx.roundRect(cx - 9 + i * 6, cy - h / 2, 4, h, 2);
          ctx.fillStyle = color + Math.floor(70 + Math.sin(t.current * 5 + i) * 30).toString(16);
          ctx.fill();
        }
      }

      if (state === "error") {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = color + "55";
        ctx.lineWidth = 2.5;
        const sx = Math.sin(t.current * 8) * 2.5;
        ctx.setTransform(1, 0, 0, 1, sx, 0);
        ctx.stroke();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }

      if (state === "tool_calling") {
        const w = Math.sin(t.current * 1.3) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r + w * 18, 0, Math.PI * 2);
        ctx.strokeStyle = color + "33";
        ctx.lineWidth = 2; ctx.stroke();
      }

      // Main orb
      const pulse = 1 + Math.sin(t.current * 1.3) * 0.03;
      const bodyGrad = ctx.createRadialGradient(cx - 6, cy - 8, 0, cx, cy, r);
      bodyGrad.addColorStop(0, "#ffffff");
      bodyGrad.addColorStop(0.55, "#f8f9fb");
      bodyGrad.addColorStop(1, "#e4e7ed");

      ctx.beginPath();
      ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
      ctx.fillStyle = bodyGrad; ctx.fill();
      ctx.strokeStyle = "#000" + "0a"; ctx.lineWidth = 1;
      ctx.stroke();

      // Center dot
      const dotR = state === "idle" ? r * 0.12 : r * 0.1;
      const dotGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR * 2);
      dotGrad.addColorStop(0, color);
      dotGrad.addColorStop(1, color + "00");
      ctx.beginPath();
      ctx.arc(cx, cy, dotR * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = dotGrad; ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, dotR * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();

      frame.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(frame.current);
  }, [state, size]);

  return (
    <div className="relative inline-flex flex-col items-center gap-3 select-none">
      <canvas
        ref={canvasRef}
        onClick={onClick}
        style={{ width: size, height: size, cursor: onClick ? "pointer" : "default" }}
        className="transition-transform duration-500 hover:scale-[1.04]"
      />
      <span
        className="text-[11px] font-semibold tracking-wide transition-colors duration-500"
        style={{ color: palette[state] }}
      >
        {labels[state]}
      </span>
    </div>
  );
}