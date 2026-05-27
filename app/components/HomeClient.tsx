"use client";

import { useState, useEffect } from "react";
import { Mic, MicOff, PhoneOff, SendHorizontal, Settings, Sparkles, Shield, FileText, GraduationCap } from "lucide-react";
import { useAgoraVoiceClient } from "@/hooks/useAgoraVoiceClient";
import { useAudioVisualization } from "@/hooks/useAudioVisualization";
import { useAudioDevices } from "@/hooks/useAudioDevices";
import { useFaceVerification } from "@/hooks/useFaceVerification";
import { AgentVisualizer, type AgentVisualizerState } from "@agora/agent-ui-kit";
import { Conversation, ConversationContent } from "@agora/agent-ui-kit";
import { Message, MessageContent } from "@agora/agent-ui-kit";
import { Response } from "@agora/agent-ui-kit";
import { MobileTabs } from "@agora/agent-ui-kit";
import { IconButton, Button } from "@agora/agent-ui-kit";
import { SettingsDialog } from "@agora/agent-ui-kit";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import FaceVerifyModal from "./FaceVerifyModal";
import DocumentViewer from "./DocumentViewer";
import Walkthrough from "./Walkthrough";
export default function HomeClient() {
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID ?? "";

  const { isConnected, isMuted, messageList, currentInProgressMessage, isAgentSpeaking, localAudioTrack, joinChannel, leaveChannel, toggleMute, sendMessage, agentUid } = useAgoraVoiceClient();

  const frequencyData = useAudioVisualization(localAudioTrack, isConnected && !isMuted);
  const { refresh: refreshMics } = useAudioDevices();

  const [isLoading, setIsLoading] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [enableAivad, setEnableAivad] = useState(true);
  const [language, setLanguage] = useState("en-US");
  const [prompt, setPrompt] = useState("");
  const [greeting, setGreeting] = useState("");
  const [showFaceVerify, setShowFaceVerify] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMic, setSelectedMic] = useState("");
  const [, setChannelName] = useState<string | undefined>(undefined);
  const [channelNameState, setChannelNameState] = useState<string>("");
  const [agentId, setAgentId] = useState<string | undefined>(undefined);
  const [isVerified, setIsVerified] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  const { reset: resetFaceVerification } = useFaceVerification({
    channelName: channelNameState,
    onVerified: (result) => {
      if (result.verified) setIsVerified(true);
    },
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSelectedMic(localStorage.getItem("selectedMicId") || "");
      const seen = localStorage.getItem("sinta_walkthrough");
      if (!seen) setShowWalkthrough(true);
    }
  }, []);

  useEffect(() => {
    if (isConnected) refreshMics();
  }, [isConnected, refreshMics]);

  const getAgentState = (): AgentVisualizerState => {
    if (!isConnected) return "not-joined";
    if (isAgentSpeaking) return "talking";
    return "listening";
  };

  const handleStart = async () => {
    if (!appId) { setError("App ID missing."); return; }
    setIsLoading(true);
    setError(null);
    setIsVerified(false);

    const requestedChannel = `sinta-${Math.random().toString(36).substring(7)}`;
    const uid = Math.floor(Math.random() * 10000) + 2000;
    let joinedChannel = false;

    try {
      const cfgRes = await fetch("/api/start-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channelName: requestedChannel, uid, connect: false }) });
      if (!cfgRes.ok) throw new Error("Failed to get agent config");
      const cfgJson = await cfgRes.json();
      const channel = typeof cfgJson.channel === "string" && cfgJson.channel ? cfgJson.channel : requestedChannel;

      const tRes = await fetch("/api/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channelName: channel, uid }) });
      if (!tRes.ok) throw new Error("Failed to get token");
      const tJson = await tRes.json();

      setChannelName(channel);
      setChannelNameState(channel);

      await joinChannel({
        appId: tJson.appId || appId, channel, token: tJson.token, uid,
        rtmUid: cfgJson.userRtmUid || `${uid}`,
        agentUid: cfgJson.agentUid,
        agentRtmUid: cfgJson.agentRtmUid,
        ...(selectedMic ? { microphoneId: selectedMic } : {}),
      });
      joinedChannel = true;

      const aRes = await fetch("/api/start-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channelName: channel, uid }) });
      if (!aRes.ok) { const aJson = await aRes.json(); throw new Error(aJson.reason || "Failed to start agent"); }
      const aJson = await aRes.json();
      setAgentId(aJson.agentId);
    } catch (e: unknown) {
      if (joinedChannel) {
        await leaveChannel();
      }
      setChannelName(undefined);
      setChannelNameState("");
      setAgentId(undefined);
      setError(e instanceof Error ? e.message : "Connection failed");
    }
    finally { setIsLoading(false); }
  };

  const handleStop = async () => {
    if (agentId) {
      try { await fetch("/api/leave-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agentId }) }); } catch { /* ignore */ }
    }
    setAgentId(undefined);
    setChannelName(undefined);
    setChannelNameState("");
    setError(null);
    setIsVerified(false);
    resetFaceVerification();
    await leaveChannel();
  };

  const handleMicChange = async (deviceId: string) => {
    setSelectedMic(deviceId);
    if (typeof window !== "undefined") {
      if (deviceId) {
        localStorage.setItem("selectedMicId", deviceId);
      } else {
        localStorage.removeItem("selectedMicId");
      }
    }
    if (isConnected && localAudioTrack && deviceId) {
      try { await localAudioTrack.setDevice(deviceId); } catch (err) { console.error("Failed to switch microphone:", err); }
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !isConnected) return;
    const success = await sendMessage(chatMessage);
    if (success) setChatMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } };

  const isAgentMessage = (uid: string) => agentUid ? uid === agentUid : false;

  const formatTime = (ts?: number) => { if (!ts) return ""; const d = new Date(ts); return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`; };

  const handleWalkthroughComplete = () => { setShowWalkthrough(false); localStorage.setItem("sinta_walkthrough", "1"); };

  return (
    <div className="relative flex h-screen flex-col bg-[#0a0a14] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(99,102,241,0.16),transparent_36%),radial-gradient(circle_at_82%_14%,rgba(16,185,129,0.10),transparent_32%),radial-gradient(circle_at_50%_86%,rgba(59,130,246,0.14),transparent_44%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
      {showWalkthrough && <Walkthrough onComplete={handleWalkthroughComplete} />}

      <header className="relative flex-shrink-0 px-5 py-3.5 border-b border-white/[0.06] bg-[#0c0c18]/90 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/25 to-violet-500/25 border border-indigo-500/25 flex items-center justify-center">
              <Sparkles size={15} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">Sinta</h1>
              <p className="text-[11px] text-white/40">School Document AI</p>
            </div>
            {isConnected && (
              <div className="flex items-center gap-2 ml-4 pl-4 border-l border-white/[0.08] animate-slide-in-right">
                <div className={cn("h-2.5 w-2.5 rounded-full", isAgentSpeaking ? "bg-emerald-400 animate-pulse" : "bg-indigo-400")} />
                <span className="text-[11px] text-white/50 font-medium">{isAgentSpeaking ? "Speaking" : "Listening"}</span>
                {isVerified && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-semibold ml-1 animate-fade-up">Verified</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="cursor-pointer rounded-full p-2 hover:bg-white/[0.05] transition-colors">
              <Settings className="h-4 w-4 text-white/40" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative flex flex-1 px-4 py-4 min-h-0 overflow-hidden min-w-0">
        {!isConnected ? (
          <div className="flex flex-1 items-center justify-center">
            {isLoading ? (
              <div className="flex flex-col items-center gap-6 anim-fade-up">
                <div className="w-16 h-16 border-2 border-indigo-500/15 border-t-indigo-400 rounded-full animate-spin" />
                <div className="text-center">
                  <p className="text-sm text-white/70 font-semibold">Connecting to Sinta...</p>
                  <p className="text-xs text-white/35 mt-1.5">Setting up your secure document session</p>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-lg rounded-3xl border border-white/[0.10] bg-[#0e0e1a]/92 backdrop-blur-xl p-8 sm:p-9 shadow-2xl anim-card-pop">
                <div className="text-center mb-8">
                  <div className="w-18 h-18 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 flex items-center justify-center mb-5">
                    <GraduationCap size={28} className="text-indigo-400" />
                  </div>
                  <p className="inline-flex items-center rounded-full border border-indigo-400/25 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-indigo-300/90">
                    Voice-First Student Help
                  </p>
                  <h2 className="mt-4 text-2xl sm:text-[1.65rem] font-bold text-white tracking-tight leading-tight">
                    Request school documents in under a minute
                  </h2>
                  <p className="text-sm text-white/55 mt-3 leading-relaxed max-w-sm mx-auto">
                    Talk to Sinta naturally to request transcripts, enrollment certificates, and billing records, then download results instantly.
                  </p>
                </div>

                <div className="space-y-2.5 mb-6">
                  {[
                    { icon: <Mic size={13} />, text: "Ask in plain language, no forms needed" },
                    { icon: <Shield size={13} />, text: "Face verification protects sensitive records" },
                    { icon: <FileText size={13} />, text: "Approved documents appear ready to download" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      <span className="text-indigo-400/60">{item.icon}</span>
                      <span className="text-xs text-white/50">{item.text}</span>
                    </div>
                  ))}
                </div>

                <div className="mb-6 grid grid-cols-3 gap-2.5">
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-2 text-center">
                    <p className="text-[11px] text-white/35 uppercase tracking-wide">Session</p>
                    <p className="mt-0.5 text-xs font-semibold text-white/75">Encrypted</p>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-2 text-center">
                    <p className="text-[11px] text-white/35 uppercase tracking-wide">Access</p>
                    <p className="mt-0.5 text-xs font-semibold text-white/75">Voice + Chat</p>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-2 text-center">
                    <p className="text-[11px] text-white/35 uppercase tracking-wide">Flow</p>
                    <p className="mt-0.5 text-xs font-semibold text-white/75">Guided</p>
                  </div>
                </div>

                <Button onClick={handleStart} disabled={isLoading || !appId} className="w-full py-3.5 text-sm font-semibold bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 border-0 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                  Start Secure Session
                </Button>
                <button
                  onClick={() => setShowWalkthrough(true)}
                  className="mt-3 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] py-2.5 text-xs font-medium text-white/65 hover:bg-white/[0.05] hover:text-white/85 transition-colors"
                >
                  View Quick Walkthrough
                </button>

                {error && <div className="mt-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 anim-fade-up"><p className="text-xs text-red-400 text-center font-medium">{error}</p></div>}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col md:flex-row gap-3 md:gap-4 min-h-0 overflow-hidden animate-fade-up">
            {/* Left Panel - Agent + Controls */}
            <div className="hidden md:flex md:w-80 lg:w-84 flex-col gap-3 self-stretch flex-shrink-0">
              <div className="rounded-xl border border-white/[0.08] bg-[#0e0e1a]/92 backdrop-blur-xl p-5 flex-shrink-0">
                <AgentVisualizer state={getAgentState()} size="sm" />
                <p className="mt-3 text-xs text-center text-white/50 font-medium">
                  {!isConnected ? "Not connected" : isAgentSpeaking ? "Sinta is speaking" : "Sinta is listening"}
                </p>
                {frequencyData.length > 0 && (
                  <div className="flex items-end justify-center gap-0.5 mt-3 h-6">
                    {frequencyData.slice(0, 16).map((v, i) => (
                      <div key={i} className="w-1 rounded-t-sm bg-indigo-500/40 transition-all duration-75" style={{ height: `${Math.max(2, v * 100)}%` }} />
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#0e0e1a]/92 backdrop-blur-xl p-4 flex-shrink-0">
                <div className="flex gap-2 justify-center">
                  <IconButton shape="square" variant={isMuted ? "standard" : "filled"} size="md" onClick={toggleMute} className="rounded-lg">{isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}</IconButton>
                  <button onClick={handleStop} className="cursor-pointer flex items-center gap-2 rounded-lg bg-red-500/15 border border-red-500/25 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/25 transition-colors">
                    <PhoneOff className="h-3.5 w-3.5" />End Session
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#0e0e1a] p-4 flex-shrink-0">
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between"><span className="text-white/50">Status</span><span className={cn("font-semibold", isConnected ? "text-emerald-400 anim-status-breathe" : "text-white/30")}>{isConnected ? "Connected" : "—"}</span></div>
                  <div className="flex items-center justify-between"><span className="text-white/50">Verified</span><span className={cn("font-semibold", isVerified ? "text-emerald-400" : "text-amber-400/70")}>{isVerified ? "Yes" : "Pending"}</span></div>
                  <div className="flex items-center justify-between"><span className="text-white/50">Mic</span><span className="font-semibold text-white/60">{isMuted ? "Muted" : "Active"}</span></div>
                </div>
                <div className="mt-4 pt-3 border-t border-white/[0.06]">
                  <button onClick={() => setShowFaceVerify(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs text-indigo-400 font-medium bg-indigo-500/10 border border-indigo-500/15 hover:bg-indigo-500/20 transition-all cursor-pointer">
                    <Shield size={12} />Verify Identity
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
                <DocumentViewer />
              </div>
            </div>

            {/* Right - Conversation */}
            <div className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0e0e1a]/88 backdrop-blur-xl">
              <MobileTabs tabs={[
                {
                  id: "chat",
                  label: "Chat",
                  content: (
                    <div className="flex flex-1 flex-col min-h-0 overflow-hidden h-full">
                      <div className="border-b border-white/[0.06] px-4 sm:px-5 py-3 flex-shrink-0 bg-[#0c0c18]/90 backdrop-blur-md">
                        <div className="flex items-center gap-2">
                          <GraduationCap size={14} className="text-indigo-400" />
                          <h2 className="font-semibold text-sm text-white/90">Conversation with Sinta</h2>
                        </div>
                        <p className="text-[11px] text-white/50 mt-0.5">{messageList.length} message{messageList.length !== 1 ? "s" : ""}</p>
                      </div>
                      <Conversation height="" className="flex-1 min-h-0 px-2 sm:px-3 py-3" style={{ overflow: "auto" }}>
                        <ConversationContent className="gap-3 pb-1">
                          {messageList.map((msg, idx) => {
                            const isAgent = isAgentMessage(msg.uid);
                            const time = formatTime(msg.timestamp);
                            return (
                              <Message key={`${msg.turn_id}-${msg.uid}-${idx}`} from={isAgent ? "assistant" : "user"} name={isAgent ? `Sinta ${time || ""}` : `You ${time || ""}`}>
                                <MessageContent className={isAgent ? "px-4 py-2.5 bg-white/[0.06] text-white/95" : "px-4 py-2.5 bg-indigo-500/30 text-white"}>
                                  <Response>{msg.text}</Response>
                                </MessageContent>
                              </Message>
                            );
                          })}
                          {currentInProgressMessage && (
                            <Message from={isAgentMessage(currentInProgressMessage.uid) ? "assistant" : "user"} name={isAgentMessage(currentInProgressMessage.uid) ? "Sinta" : "You"}>
                              <MessageContent className={`animate-pulse px-4 py-2.5 ${isAgentMessage(currentInProgressMessage.uid) ? "bg-white/[0.06] text-white/85" : "bg-indigo-500/30 text-white"}`}>
                                <Response>{currentInProgressMessage.text}</Response>
                              </MessageContent>
                            </Message>
                          )}
                        </ConversationContent>
                      </Conversation>
                      <div className="border-t border-white/[0.06] p-3 flex-shrink-0 bg-[#0c0c18]/90 backdrop-blur-md">
                        <div className="flex gap-2">
                          <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={handleKeyPress} placeholder="Type a message to Sinta..." disabled={!isConnected} className="flex-1 rounded-lg border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 disabled:opacity-50" />
                          <button onClick={handleSendMessage} disabled={!isConnected || !chatMessage.trim()} className="cursor-pointer h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-500/25 border border-indigo-500/25 text-indigo-400 hover:bg-indigo-500/35 disabled:opacity-30 transition-all active:scale-95">
                            <SendHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  id: "docs",
                  label: "Docs",
                  content: (
                    <div className="flex-1 min-h-0 overflow-hidden p-2 sm:p-3">
                      <DocumentViewer />
                    </div>
                  ),
                },
              ]} />
            </div>

            {/* Mobile Controls */}
            <div className="flex md:hidden gap-2 p-3 border border-white/[0.08] rounded-xl bg-[#0c0c18]/90 backdrop-blur-md justify-center items-center flex-shrink-0">
              <IconButton shape="square" variant={isMuted ? "standard" : "filled"} size="md" onClick={toggleMute} className="rounded-lg">{isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}</IconButton>
              <button onClick={handleStop} className="cursor-pointer flex items-center gap-2 rounded-lg bg-red-500/15 border border-red-500/25 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/25 transition-colors">
                <PhoneOff className="h-3.5 w-3.5" />End Session
              </button>
            </div>
          </div>
        )}
      </main>

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} enableAivad={enableAivad} onEnableAivadChange={setEnableAivad} language={language} onLanguageChange={setLanguage} prompt={prompt} onPromptChange={setPrompt} greeting={greeting} onGreetingChange={setGreeting} disabled={isConnected} selectedMicId={selectedMic} onMicChange={handleMicChange} />

      <FaceVerifyModal open={showFaceVerify} onClose={() => { setShowFaceVerify(false); resetFaceVerification(); }} onVerified={(result) => { if (result.verified) setIsVerified(true); }} channelName={channelNameState} />
    </div>
  );
}
