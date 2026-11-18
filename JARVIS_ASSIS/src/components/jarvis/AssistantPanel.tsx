import React, { useEffect, useRef, useState } from "react";
import { useVoiceAssistant } from "@/hooks/use-voice-assistant";
import { useJarvisBrain } from "@/hooks/use-jarvis-brain";
import { Mic, MicOff, Send, Terminal, Activity, Brain, Radio, Eye, EyeOff } from "lucide-react";
import { Panel } from "./Panel";

export function AssistantPanel() {
  const {
    state,
    messages,
    transcript,
    interimTranscript,
    amplitude,
    error,
    startListening,
    stopListening,
    sendText,
    isListening,
    isSpeaking,
  } = useVoiceAssistant();

  const {
    wakeWordEnabled,
    setWakeWordEnabled,
    latestEmotion,
    activeAgent,
    reasoningTrace,
    setIsMemoryOpen,
    setIsPersonaOpen,
  } = useJarvisBrain();

  const [inputText, setInputText] = useState("");
  const [showTrace, setShowTrace] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, transcript, interimTranscript]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    sendText(inputText.trim());
    setInputText("");
  };

  const getStatusText = () => {
    if (error) return "ERROR";
    if (isListening) return "LISTENING . . .";
    if (isSpeaking) return "SPEAKING . . .";
    if (state === "processing") return "PROCESSING . . .";
    return "ONLINE";
  };

  return (
    <Panel className="w-full max-w-xl flex flex-col h-full max-h-[440px] relative">
      {/* Top Header Controls */}
      <div className="mb-2 flex items-center justify-between border-b border-hud-cyan/20 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-display text-[10px] tracking-[0.4em] text-hud-cyan">▸ JARVIS CORE</span>
          <span
            className={`text-[9px] tracking-[0.3em] ${
              error ? "text-red-400" : isListening || isSpeaking ? "text-hud-cyan animate-flicker" : "text-muted-foreground"
            }`}
          >
            {getStatusText()}
          </span>

          {/* Emotion Badge */}
          <span className="ml-2 text-[8px] tracking-[0.2em] border border-hud-cyan/30 px-1.5 py-0.5 rounded text-hud-cyan bg-hud-cyan/10">
            EMOTION: {latestEmotion.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Memory Modal Trigger */}
          <button
            onClick={() => setIsMemoryOpen(true)}
            title="Open Memory & Knowledge Core"
            className="flex h-6 w-6 items-center justify-center rounded border border-hud-cyan/40 text-hud-cyan/70 hover:border-hud-cyan hover:text-hud-cyan transition-colors"
          >
            <Brain className="h-3 w-3" />
          </button>

          {/* Reasoning Trace Toggle */}
          <button
            onClick={() => setShowTrace((prev) => !prev)}
            title="Toggle Explainable AI Trace"
            className={`flex h-6 w-6 items-center justify-center rounded border transition-colors ${
              showTrace ? "border-hud-cyan bg-hud-cyan/20 text-hud-cyan" : "border-hud-cyan/40 text-hud-cyan/60 hover:border-hud-cyan hover:text-hud-cyan"
            }`}
          >
            {showTrace ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </button>

          {/* Wake Word Indicator */}
          <button
            onClick={() => setWakeWordEnabled(!wakeWordEnabled)}
            title={wakeWordEnabled ? "Wake Word Active ('Hey Jarvis')" : "Wake Word Off"}
            className={`flex h-6 px-1.5 text-[9px] items-center gap-1 rounded border transition-colors ${
              wakeWordEnabled
                ? "border-hud-green bg-hud-green/10 text-hud-green shadow-[0_0_8px_var(--hud-green)]"
                : "border-hud-cyan/30 text-muted-foreground"
            }`}
          >
            <Radio className="h-2.5 w-2.5 animate-pulse" />
            WAKE
          </button>

          {/* Microphone Toggle */}
          <button
            onClick={isListening ? stopListening : startListening}
            className={`flex h-6 w-6 items-center justify-center rounded border transition-colors ${
              isListening
                ? "border-hud-cyan bg-hud-cyan/20 text-hud-cyan shadow-[0_0_10px_var(--hud-cyan)]"
                : "border-hud-cyan/40 text-hud-cyan/60 hover:border-hud-cyan hover:text-hud-cyan"
            }`}
          >
            {isListening ? <Mic className="h-3 w-3 animate-pulse" /> : <MicOff className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Explainable AI Trace Drawer (Collapsible) */}
      {showTrace && (
        <div className="mb-2 p-2 rounded border border-hud-cyan/30 bg-hud-cyan/5 font-display text-[10px] tracking-wider text-hud-cyan animate-in slide-in-from-top-2 duration-150">
          <div className="flex justify-between items-center border-b border-hud-cyan/20 pb-1 mb-1 text-[9px] text-muted-foreground tracking-[0.2em]">
            <span>EXPLAINABLE AI REASONING TRACE</span>
            <span>AGENT: {activeAgent.toUpperCase()}</span>
          </div>
          {reasoningTrace.length > 0 ? (
            reasoningTrace.map((step, idx) => (
              <div key={idx} className="py-0.5 text-foreground/90">{step}</div>
            ))
          ) : (
            <div className="text-muted-foreground text-center py-1">All agent systems ready. Awaiting input query.</div>
          )}
        </div>
      )}

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 hud-scrollbar font-display">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div className="text-[8px] tracking-[0.3em] text-muted-foreground mb-1">
              {msg.role === "user" ? "USER" : "JARVIS"} // {new Date(msg.timestamp).toLocaleTimeString([], { hour12: false })}
            </div>
            <div
              className={`max-w-[85%] rounded border p-2 text-sm tracking-wider ${
                msg.role === "user"
                  ? "border-hud-blue/50 bg-hud-blue/10 text-hud-blue"
                  : msg.type === "error"
                    ? "border-red-500/50 bg-red-500/10 text-red-400"
                    : "border-hud-cyan/40 bg-hud-cyan/10 text-hud-cyan hud-text-glow"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {/* Live Transcript Bubble */}
        {(transcript || interimTranscript) && (
          <div className="flex flex-col items-end">
            <div className="text-[8px] tracking-[0.3em] text-muted-foreground mb-1">
              USER // LIVE
            </div>
            <div className="max-w-[85%] rounded border border-hud-blue/50 bg-hud-blue/10 p-2 text-sm tracking-wider text-hud-blue opacity-70">
              {transcript}
              <span className="text-hud-blue/50">{interimTranscript}</span>
              <span className="animate-pulse">_</span>
            </div>
          </div>
        )}

        <div ref={endOfMessagesRef} />
      </div>

      {/* Real-time Waveform */}
      {(isListening || isSpeaking || state === "processing") && (
        <div className="mt-3 flex h-8 items-end gap-[2px] opacity-70 px-2 justify-center">
          {amplitude.slice(0, 32).map((val, i) => (
            <div
              key={i}
              className={`w-1 rounded-t-sm transition-all duration-75 ${
                isListening ? "bg-hud-blue" : "bg-hud-cyan"
              }`}
              style={{
                height: `${Math.max(4, val * 32)}px`,
                boxShadow: `0 0 8px ${isListening ? "var(--hud-blue)" : "var(--hud-cyan)"}`,
              }}
            />
          ))}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSend} className="mt-3 flex gap-2 border-t border-hud-cyan/20 pt-3">
        <div className="relative flex-1">
          <Terminal className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-hud-cyan/50" />
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="ENTER COMMAND..."
            className="w-full rounded border border-hud-cyan/40 bg-transparent py-1.5 pl-7 pr-3 font-display text-xs tracking-widest text-hud-cyan placeholder:text-hud-cyan/30 focus:border-hud-cyan focus:outline-none focus:shadow-[0_0_10px_var(--hud-cyan)]"
          />
        </div>
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="flex items-center justify-center rounded border border-hud-cyan/40 px-3 transition-colors hover:border-hud-cyan hover:bg-hud-cyan/10 disabled:opacity-30 text-hud-cyan"
        >
          <Send className="h-3 w-3" />
        </button>
      </form>
    </Panel>
  );
}
