"use client";

import { MessageSquare, FileSearch, Headphones } from "lucide-react";

export type AppMode = "voice_guide" | "find_docs" | "support";

const modes: { id: AppMode; label: string; icon: React.ReactNode }[] = [
  { id: "voice_guide", label: "Voice Guide", icon: <MessageSquare size={16} /> },
  { id: "find_docs", label: "Find Documents", icon: <FileSearch size={16} /> },
  { id: "support", label: "Customer Support", icon: <Headphones size={16} /> },
];

interface ModeSelectorProps {
  active: AppMode;
  onChange: (mode: AppMode) => void;
  disabled?: boolean;
}

export default function ModeSelector({ active, onChange, disabled }: ModeSelectorProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest px-1">Choose Mode</p>
      <div className="flex flex-col gap-1">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            disabled={disabled}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-300 ${
              active === m.id
                ? "bg-white/[0.08] text-white border border-white/[0.12]"
                : "text-white/35 hover:text-white/60 hover:bg-white/[0.03] border border-transparent"
            } disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            <span className={active === m.id ? "text-indigo-400" : "text-white/20"}>{m.icon}</span>
            <span className="text-xs font-medium">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}