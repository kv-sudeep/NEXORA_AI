import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles, X, Send, Bot, User, Loader2, Minimize2, Maximize2,
  Trash2, Copy, Check, ChevronDown, Mic, MicOff, Film, Image,
  Scissors, Palette, Wand2, Volume2, RotateCcw, Download
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────
export type BotMode = "video" | "photo";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  ts: Date;
  thinking?: boolean;
  copied?: boolean;
}

interface QuickAction {
  label: string;
  icon: React.ElementType;
  prompt: string;
  color: string;
}

interface AIStudioBotProps {
  mode: BotMode;
  /** Pass context about current state so AI can give relevant advice */
  contextHint?: string;
  /** Called when user wants to close the panel */
  onClose?: () => void;
  /** Whether shown as side-panel (default) or floating fab */
  variant?: "panel" | "fab";
  /** Purple theme for DysonPhoto, cyan theme for NEXORA Video */
  theme?: "purple" | "cyan";
}

// ─────────────────────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────────────────────
const VIDEO_QUICK: QuickAction[] = [
  { label: "Split Clip", icon: Scissors, prompt: "How do I split a clip at the playhead in this video editor?", color: "text-cyan-400" },
  { label: "Add Transition", icon: Film, prompt: "What transitions are available and how do I add one between clips?", color: "text-blue-400" },
  { label: "Color Grade", icon: Palette, prompt: "Walk me through how to color grade my footage using the color tools.", color: "text-purple-400" },
  { label: "AI Enhance", icon: Sparkles, prompt: "How do I use the AI enhancement features to improve my video?", color: "text-emerald-400" },
  { label: "Remove Silence", icon: Volume2, prompt: "How do I automatically detect and remove silent gaps from my video?", color: "text-orange-400" },
  { label: "Export Video", icon: Download, prompt: "What export settings should I use for best quality on YouTube/Instagram?", color: "text-rose-400" },
];

const PHOTO_QUICK: QuickAction[] = [
  { label: "Retouch Skin", icon: Wand2, prompt: "How do I retouch skin and remove blemishes on this photo?", color: "text-purple-400" },
  { label: "Color Adjust", icon: Palette, prompt: "Walk me through adjusting brightness, contrast, and saturation for this image.", color: "text-violet-400" },
  { label: "Remove BG", icon: Image, prompt: "How do I remove or replace the background in my photo?", color: "text-fuchsia-400" },
  { label: "Sharpen", icon: Sparkles, prompt: "What's the best way to sharpen and enhance the detail in my photo?", color: "text-pink-400" },
  { label: "AI Filter", icon: Film, prompt: "What AI filters are available and how do I apply them?", color: "text-rose-400" },
  { label: "Export", icon: Download, prompt: "What export settings should I use for best quality web and print output?", color: "text-orange-400" },
];

const SYSTEM_VIDEO = `You are NEXORA AI, an expert video editing assistant embedded in the NEXORA Video Studio timeline editor. 
Help users with: timeline editing, clip trimming/splitting, transitions, audio mixing, color grading, AI effects, 
motion graphics, rendering, and all features of the professional video studio. 
Give concise, practical, step-by-step answers. Use markdown formatting with bullet points.
When the user asks about a feature, explain exactly which panel/button to click.`;

const SYSTEM_PHOTO = `You are DYSON AI, an expert photo editing assistant embedded in the DYSON PHOTOS studio (Photoshop-style interface).
Help users with: layer management, color adjustments (brightness/contrast/saturation), brushes, 
filters, retouching, background removal, text tools, blending modes, export settings, and all photo editing workflows.
Give concise, practical, step-by-step answers. Use markdown formatting with bullet points.
When the user asks about a feature, explain exactly which panel/button to click.`;

// ─────────────────────────────────────────────────────────────────────────────
//  Helper: call backend /api/jarvis/chat
// ─────────────────────────────────────────────────────────────────────────────
async function askJarvisChat(message: string, systemPrompt: string): Promise<string> {
  try {
    const res = await fetch("/api/jarvis/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `[SYSTEM CONTEXT: ${systemPrompt}]\n\nUser: ${message}`,
        voice: false,
      }),
    });
    const data = await res.json();
    if (data.reply) return data.reply;
    if (data.response) return data.response;
    if (data.text) return data.text;
    // fallback: stringify whatever we got
    return typeof data === "string" ? data : JSON.stringify(data);
  } catch (err: any) {
    return `⚠️ Connection error: ${err?.message ?? "Could not reach JARVIS backend."}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Markdown-lite renderer (bold, bullets, inline code)
// ─────────────────────────────────────────────────────────────────────────────
function RenderMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        // Bullet
        if (/^[\*\-]\s/.test(line)) {
          return (
            <div key={i} className="flex gap-1.5 ml-1">
              <span className="mt-0.5 shrink-0 text-current opacity-60">•</span>
              <span dangerouslySetInnerHTML={{ __html: formatInline(line.slice(2)) }} />
            </div>
          );
        }
        // Numbered
        if (/^\d+\.\s/.test(line)) {
          return (
            <div key={i} className="flex gap-1.5 ml-1">
              <span className="shrink-0 opacity-60">{line.match(/^\d+/)![0]}.</span>
              <span dangerouslySetInnerHTML={{ __html: formatInline(line.replace(/^\d+\.\s/, "")) }} />
            </div>
          );
        }
        // Heading
        if (/^#{1,3}\s/.test(line)) {
          return (
            <div key={i} className="font-bold mt-2 opacity-90" dangerouslySetInnerHTML={{ __html: formatInline(line.replace(/^#{1,3}\s/, "")) }} />
          );
        }
        // Empty line
        if (line.trim() === "") return <div key={i} className="h-1" />;
        // Normal
        return <div key={i} dangerouslySetInnerHTML={{ __html: formatInline(line) }} />;
      })}
    </div>
  );
}

function formatInline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code class="bg-black/30 px-1 rounded text-[10px] font-mono">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────────────────────────────────────
export const AIStudioBot: React.FC<AIStudioBotProps> = ({
  mode,
  contextHint,
  onClose,
  variant = "panel",
  theme,
}) => {
  const resolvedTheme = theme ?? (mode === "photo" ? "purple" : "cyan");
  const isPhoto = mode === "photo";
  const quickActions = isPhoto ? PHOTO_QUICK : VIDEO_QUICK;
  const systemPrompt = isPhoto ? SYSTEM_PHOTO : SYSTEM_VIDEO;
  const botName = isPhoto ? "DYSON AI" : "NEXORA AI";

  // ── State ────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: isPhoto
        ? `👋 Hi! I'm **DYSON AI**, your photo editing assistant.\n\nI can help you with layers, color adjustments, filters, retouching, and anything else in this studio.\n\nWhat would you like to do?`
        : `👋 Hi! I'm **NEXORA AI**, your video editing assistant.\n\nI can help you with timeline editing, transitions, color grading, audio, AI effects, and rendering.\n\nWhat would you like to do?`,
      ts: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [fabOpen, setFabOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Scroll to bottom on new message ─────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    setInput("");
    setShowQuick(false);

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      text: text.trim(),
      ts: new Date(),
    };

    const thinkingMsg: Message = {
      id: `thinking-${Date.now()}`,
      role: "assistant",
      text: "",
      ts: new Date(),
      thinking: true,
    };

    setMessages((prev) => [...prev, userMsg, thinkingMsg]);
    setIsLoading(true);

    const contextualPrompt = contextHint
      ? `${systemPrompt}\n\nCurrent workspace context: ${contextHint}`
      : systemPrompt;

    const reply = await askJarvisChat(text.trim(), contextualPrompt);

    setMessages((prev) =>
      prev
        .filter((m) => !m.thinking)
        .concat({
          id: `a-${Date.now()}`,
          role: "assistant",
          text: reply,
          ts: new Date(),
        })
    );
    setIsLoading(false);
  }, [isLoading, contextHint, systemPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const copyMessage = async (msg: Message) => {
    await navigator.clipboard.writeText(msg.text);
    setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, copied: true } : m));
    setTimeout(() =>
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, copied: false } : m)),
    1500);
  };

  const clearChat = () => {
    setMessages([messages[0]]);
    setShowQuick(true);
  };

  // ── Theme values ─────────────────────────────────────────────────────────
  const T = resolvedTheme === "purple"
    ? {
        bg: "bg-[#0f0d19]",
        border: "border-[#3b2d6e]",
        header: "bg-[#161324]",
        headerBorder: "border-[#2a2542]",
        accent: "text-[#a855f7]",
        accentBg: "bg-[#a855f7]",
        glow: "shadow-[0_0_30px_rgba(168,85,247,0.25)]",
        input: "bg-[#1a162b] border-[#342e52] focus:border-[#a855f7]",
        sendBtn: "bg-gradient-to-r from-[#7c3aed] to-[#a855f7] hover:from-[#6d28d9] hover:to-[#9333ea]",
        userBubble: "bg-[#4c1d95]/70 border-[#6d28d9]/50",
        aiBubble: "bg-[#161324] border-[#2a2542]",
        quickHover: "hover:bg-[#1a162b] hover:border-[#6d28d9]",
        icon: "text-[#a855f7]",
        fabBtn: "bg-gradient-to-br from-[#7c3aed] to-[#a855f7]",
      }
    : {
        bg: "bg-slate-950",
        border: "border-cyan-500/30",
        header: "bg-slate-900",
        headerBorder: "border-slate-800",
        accent: "text-cyan-400",
        accentBg: "bg-cyan-500",
        glow: "shadow-[0_0_30px_rgba(6,182,212,0.2)]",
        input: "bg-slate-900 border-slate-800 focus:border-cyan-500",
        sendBtn: "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500",
        userBubble: "bg-blue-900/40 border-blue-700/40",
        aiBubble: "bg-slate-900 border-slate-800",
        quickHover: "hover:bg-slate-900 hover:border-cyan-500/40",
        icon: "text-cyan-400",
        fabBtn: "bg-gradient-to-br from-cyan-500 to-blue-600",
      };

  // ── FAB variant (floating button + popup) ───────────────────────────────
  if (variant === "fab") {
    return (
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
        {/* Chat Panel */}
        {fabOpen && (
          <div
            className={`w-80 sm:w-96 ${T.bg} border ${T.border} rounded-xl ${T.glow} flex flex-col overflow-hidden`}
            style={{ height: "520px" }}
          >
            <ChatHeader
              botName={botName} T={T}
              minimized={false}
              onMinimize={() => setFabOpen(false)}
              onClose={() => setFabOpen(false)}
              onClear={clearChat}
              isPhoto={isPhoto}
            />
            <ChatBody
              messages={messages} isLoading={isLoading} T={T}
              showQuick={showQuick} quickActions={quickActions}
              onQuickAction={(p: string) => sendMessage(p)}
              onCopy={copyMessage}
              messagesEndRef={messagesEndRef}
            />
            <ChatInput
              input={input} setInput={setInput}
              onSend={() => sendMessage(input)}
              onKeyDown={handleKeyDown}
              isLoading={isLoading}
              inputRef={inputRef}
              T={T}
            />
          </div>
        )}
        {/* FAB Button */}
        <button
          onClick={() => setFabOpen((v) => !v)}
          className={`w-14 h-14 rounded-full ${T.fabBtn} text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform ${T.glow}`}
          title={`${botName} — AI Assistant`}
        >
          {fabOpen ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
        </button>
      </div>
    );
  }

  // ── Panel variant (embedded side panel) ─────────────────────────────────
  return (
    <div
      className={`flex flex-col ${T.bg} border-l ${T.border} ${T.glow} transition-all overflow-hidden`}
      style={{ width: minimized ? "48px" : "320px", minWidth: minimized ? "48px" : "320px" }}
    >
      {minimized ? (
        // Collapsed strip
        <div className="flex flex-col items-center py-4 gap-4 cursor-pointer" onClick={() => setMinimized(false)}>
          <Sparkles className={`w-5 h-5 ${T.icon}`} />
          <span className={`text-[9px] font-bold tracking-widest uppercase ${T.accent} writing-vertical`}
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>
            {botName}
          </span>
        </div>
      ) : (
        <>
          <ChatHeader
            botName={botName} T={T}
            minimized={minimized}
            onMinimize={() => setMinimized(true)}
            onClose={onClose}
            onClear={clearChat}
            isPhoto={isPhoto}
          />
          <ChatBody
            messages={messages} isLoading={isLoading} T={T}
            showQuick={showQuick} quickActions={quickActions}
            onQuickAction={(p: string) => sendMessage(p)}
            onCopy={copyMessage}
            messagesEndRef={messagesEndRef}
          />
          <ChatInput
            input={input} setInput={setInput}
            onSend={() => sendMessage(input)}
            onKeyDown={handleKeyDown}
            isLoading={isLoading}
            inputRef={inputRef}
            T={T}
          />
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ChatHeader({ botName, T, minimized, onMinimize, onClose, onClear, isPhoto }: any) {
  return (
    <div className={`px-3 py-2.5 ${T.header} border-b ${T.headerBorder} flex items-center gap-2 shrink-0`}>
      <div className={`w-6 h-6 rounded-full ${T.accentBg} flex items-center justify-center shrink-0`}>
        {isPhoto
          ? <Wand2 className="w-3.5 h-3.5 text-white" />
          : <Sparkles className="w-3.5 h-3.5 text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-[11px] font-bold ${T.accent} tracking-widest`}>{botName}</div>
        <div className="text-[9px] text-current opacity-40 leading-none">AI Studio Assistant</div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onClear}
          title="Clear chat"
          className="p-1 text-current opacity-40 hover:opacity-80 rounded transition-opacity"
        >
          <Trash2 className="w-3 h-3" />
        </button>
        {onMinimize && (
          <button
            onClick={onMinimize}
            title="Minimize"
            className="p-1 text-current opacity-40 hover:opacity-80 rounded transition-opacity"
          >
            <Minimize2 className="w-3 h-3" />
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            title="Close"
            className="p-1 text-current opacity-40 hover:opacity-80 rounded transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function ChatBody({ messages, isLoading, T, showQuick, quickActions, onQuickAction, onCopy, messagesEndRef }: any) {
  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin scrollbar-thumb-current/20">
      {messages.map((msg: Message) => (
        <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
          {/* Avatar */}
          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
            msg.role === "user" ? "bg-slate-700" : T.accentBg
          }`}>
            {msg.role === "user"
              ? <User className="w-3.5 h-3.5 text-white" />
              : <Bot className="w-3.5 h-3.5 text-white" />}
          </div>
          {/* Bubble */}
          <div className={`max-w-[85%] rounded-lg px-3 py-2 border text-[11px] leading-relaxed relative group ${
            msg.role === "user" ? T.userBubble : T.aiBubble
          }`}>
            {msg.thinking ? (
              <div className="flex items-center gap-1.5 text-current opacity-50">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="text-[10px]">Thinking…</span>
              </div>
            ) : (
              <>
                <RenderMarkdown text={msg.text} />
                {/* Copy button */}
                {msg.role === "assistant" && (
                  <button
                    onClick={() => onCopy(msg)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded bg-current/10 border border-current/20 items-center justify-center hidden group-hover:flex opacity-70 hover:opacity-100 transition-opacity"
                  >
                    {msg.copied
                      ? <Check className="w-2.5 h-2.5 text-green-400" />
                      : <Copy className="w-2.5 h-2.5" />}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      ))}

      {/* Quick action chips */}
      {showQuick && (
        <div className="pt-1 space-y-2">
          <div className="text-[9px] uppercase font-bold opacity-30 tracking-widest">Quick Actions</div>
          <div className="grid grid-cols-2 gap-1.5">
            {quickActions.map((qa: QuickAction) => (
              <button
                key={qa.label}
                onClick={() => onQuickAction(qa.prompt)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-current/10 text-[10px] text-left transition-colors ${T.quickHover}`}
              >
                <qa.icon className={`w-3 h-3 shrink-0 ${qa.color}`} />
                <span className="font-medium opacity-80">{qa.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

function ChatInput({ input, setInput, onSend, onKeyDown, isLoading, inputRef, T }: any) {
  return (
    <div className={`px-3 py-2.5 border-t ${T.headerBorder} shrink-0`}>
      <div className="flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask anything about editing…"
          rows={1}
          disabled={isLoading}
          className={`flex-1 resize-none rounded-lg border px-2.5 py-2 text-[11px] text-current bg-transparent placeholder:opacity-30 focus:outline-none transition-colors ${T.input}`}
          style={{ maxHeight: "80px", overflowY: "auto" }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 80) + "px";
          }}
        />
        <button
          onClick={onSend}
          disabled={isLoading || !input.trim()}
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${T.sendBtn} text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all`}
        >
          {isLoading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Send className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className="text-[9px] opacity-25 mt-1.5 text-center">Enter to send · Shift+Enter for new line</div>
    </div>
  );
}
