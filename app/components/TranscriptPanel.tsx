"use client";

import { useRef, useEffect } from "react";

export interface TranscriptMessage {
  id: string;
  ts: number;
  publisher: string;
  message: string;
}

interface TranscriptPanelProps {
  messages: TranscriptMessage[];
  statusLines: string[];
  isConnected: boolean;
}

export default function TranscriptPanel({ messages, statusLines, isConnected }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            {isConnected
              ? "Your conversation will appear here.\nTap the mic to start speaking."
              : "Preparing your session..."}
          </p>
        </div>
      )}

      {messages.map((t, i) => {
        const isAgent = t.publisher.toLowerCase().includes("agent");
        return (
          <div key={`${t.id}-${i}`} className={`flex ${isAgent ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                isAgent
                  ? "bg-muted text-foreground rounded-bl-sm"
                  : "bg-primary text-primary-foreground rounded-br-sm"
              }`}
            >
              <span className={`block text-[9px] font-bold mb-0.5 uppercase tracking-wider ${isAgent ? "text-muted-foreground" : "text-primary-foreground/60"}`}>
                {isAgent ? "Agent" : "You"}
              </span>
              <p className="leading-relaxed whitespace-pre-wrap">{t.message}</p>
            </div>
          </div>
        );
      })}

      {statusLines.length > 0 && (
        <div className="pt-3 mt-2 border-t border-border">
          <div className="font-mono text-[8px] space-y-0.5 text-muted-foreground max-h-16 overflow-y-auto">
            {statusLines.slice(-6).map((l, i) => <div key={i} className="truncate">{l}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}