"use client";

import { useState } from "react";
import { Sparkles, ArrowRight, Mic, Shield, FileText, Download, Check } from "lucide-react";

interface WalkthroughProps {
  onComplete: () => void;
}

const steps = [
  {
    icon: <Sparkles size={22} />,
    title: "Welcome to Sinta",
    description: "Your school document AI assistant. Just talk to Sinta naturally — she understands voice commands and helps you access your official school documents.",
    color: "from-indigo-500 to-violet-500",
  },
  {
    icon: <Mic size={22} />,
    title: "Start a Conversation",
    description: "Start a voice call with Sinta. Tell her your name and student ID. She'll guide you through everything you need — transcripts, enrollment certificates, bank statements, and more.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: <Shield size={22} />,
    title: "Quick Identity Check",
    description: "Sinta will ask you to verify your identity. A verification window opens — take a quick selfie or upload your school ID. This keeps your documents secure.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: <FileText size={22} />,
    title: "Get Your Documents",
    description: "Once verified, Sinta fetches your requested documents instantly. Transcripts, enrollment certificates, bank statements — whatever you need.",
    color: "from-rose-500 to-pink-500",
  },
  {
    icon: <Download size={22} />,
    title: "Download & Go",
    description: "Documents appear right here in the viewer. One tap to download. Everything is real-time — you talk, Sinta delivers.",
    color: "from-cyan-500 to-blue-500",
  },
];

export default function Walkthrough({ onComplete }: WalkthroughProps) {
  const [step, setStep] = useState(0);
  const current = steps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg">
      <div className="w-full max-w-lg mx-4 bg-[#0a0a0f] border border-white/[0.04] rounded-3xl shadow-2xl overflow-hidden">
        {/* Progress */}
        <div className="flex gap-1 px-6 pt-6">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? "bg-gradient-to-r " + steps[i].color : "bg-white/[0.04]"}`} />
          ))}
        </div>

        <div className="p-8 pb-6 text-center">
          {/* Icon */}
          <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${current.color} opacity-10 flex items-center justify-center mb-6`}>
            <span className="text-white/80">{current.icon}</span>
          </div>

          <h2 className="text-lg font-bold text-white mb-3">{current.title}</h2>
          <p className="text-sm text-white/35 leading-relaxed max-w-sm mx-auto">{current.description}</p>

          {/* Step indicator */}
          <div className="mt-6 text-[10px] text-white/15">
            Step {step + 1} of {steps.length}
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3 justify-center">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="px-5 py-2.5 rounded-xl border border-white/[0.06] text-white/40 text-sm hover:bg-white/[0.02] transition-all">
                Back
              </button>
            )}
            {step < steps.length - 1 ? (
              <button onClick={() => setStep(step + 1)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm font-medium hover:bg-white/[0.08] transition-all">
                Next <ArrowRight size={14} />
              </button>
            ) : (
              <button onClick={onComplete} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold hover:opacity-90 transition-all active:scale-95">
                <Check size={14} /> Get Started
              </button>
            )}
          </div>

          {step === steps.length - 1 && (
            <button onClick={onComplete} className="mt-3 text-[11px] text-white/15 hover:text-white/25 transition-colors">
              Skip, I know how it works
            </button>
          )}
        </div>
      </div>
    </div>
  );
}