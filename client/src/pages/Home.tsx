import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  CloudSun,
  Coffee,
  Command,
  Headphones,
  ListChecks,
  Mic,
  MoreHorizontal,
  Music2,
  Pause,
  Play,
  Plus,
  Search,
  Settings2,
  Sparkles,
  SquarePen,
  SunMedium,
  Volume2,
  Waves,
} from "lucide-react";

type AssistantStatus = "ready" | "listening" | "thinking" | "responding" | "unavailable";
type Activity = {
  id: number;
  command: string;
  result: string;
  time: string;
  icon: "calendar" | "sun" | "check" | "music";
  tone: "peach" | "lavender" | "sage" | "blue";
};

type SpeechRecognitionEventLike = Event & {
  results: { [index: number]: { [index: number]: { transcript: string } } };
};
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const quickActions = [
  { label: "Plan my day", icon: CalendarDays, prompt: "Plan my day", tint: "peach" },
  { label: "What's the weather?", icon: CloudSun, prompt: "What's the weather like today?", tint: "blue" },
  { label: "Add a reminder", icon: ListChecks, prompt: "Remind me to take a break at 3 PM", tint: "sage" },
  { label: "Play something", icon: Music2, prompt: "Play something calm", tint: "lavender" },
] as const;

const starterActivity: Activity[] = [
  { id: 1, command: "Plan my day", result: "3 priorities mapped", time: "9:12 AM", icon: "calendar", tone: "peach" },
  { id: 2, command: "What's the weather?", result: "72° and sunny", time: "8:48 AM", icon: "sun", tone: "lavender" },
  { id: 3, command: "Remind me to call Mum", result: "Reminder set for 5:30 PM", time: "Yesterday", icon: "check", tone: "sage" },
];

const statusCopy: Record<AssistantStatus, { label: string; helper: string }> = {
  ready: { label: "Ready when you are", helper: "Tap the orb or press Space to speak" },
  listening: { label: "I'm listening…", helper: "Tell me what you need" },
  thinking: { label: "One moment…", helper: "I'm finding the best answer" },
  responding: { label: "Here's what I found", helper: "You can keep the conversation going" },
  unavailable: { label: "Voice is unavailable", helper: "Try one of the suggested actions below" },
};

function ActivityIcon({ type }: { type: Activity["icon"] }) {
  if (type === "calendar") return <CalendarDays size={17} strokeWidth={1.8} />;
  if (type === "sun") return <SunMedium size={17} strokeWidth={1.8} />;
  if (type === "music") return <Music2 size={17} strokeWidth={1.8} />;
  return <Check size={17} strokeWidth={2} />;
}

function formatTime() {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date());
}

export default function Home({ onOpenRoutines, onCreateRoutine }: { onOpenRoutines: () => void; onCreateRoutine: () => void }) {
  const [status, setStatus] = useState<AssistantStatus>("ready");
  const [transcript, setTranscript] = useState("");
  const [assistantReply, setAssistantReply] = useState("I can help you plan, remember, find, or simply make space for what matters today.");
  const [activity, setActivity] = useState<Activity[]>(starterActivity);
  const [showAll, setShowAll] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const timersRef = useRef<number[]>([]);

  const visibleActivity = useMemo(() => (showAll ? activity : activity.slice(0, 3)), [activity, showAll]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    clearTimers();
  }, [clearTimers]);

  const finishCommand = useCallback((command: string) => {
    const cleanCommand = command.trim() || "Help me get started";
    const lower = cleanCommand.toLowerCase();
    let result = "Done — I've added that to your flow.";
    let icon: Activity["icon"] = "check";
    let tone: Activity["tone"] = "sage";
    let reply = "Done. I’ve added that to your flow so you can stay focused on what’s next.";

    if (lower.includes("weather")) {
      result = "72° and sunny";
      icon = "sun";
      tone = "lavender";
      reply = "It’s 72° and sunny today. A light layer should do nicely this morning.";
    } else if (lower.includes("plan") || lower.includes("day")) {
      result = "3 priorities mapped";
      icon = "calendar";
      tone = "peach";
      reply = "Your day has room for three things: deep work before lunch, a reset this afternoon, and one small win before you wrap.";
    } else if (lower.includes("play") || lower.includes("music")) {
      result = "Focus mix queued";
      icon = "music";
      tone = "blue";
      reply = "I queued a calm focus mix. Let’s make the next hour feel a little lighter.";
      setIsPlaying(true);
    } else if (lower.includes("remind") || lower.includes("remember")) {
      result = "Reminder set for 3:00 PM";
      reply = "Consider it remembered. I’ll nudge you at 3:00 PM so it doesn’t have to stay in your head.";
    }

    setTranscript(cleanCommand);
    setAssistantReply(reply);
    setStatus("responding");
    setActivity((current) => [
      { id: Date.now(), command: cleanCommand, result, time: formatTime(), icon, tone },
      ...current,
    ]);
  }, []);

  const runDemoCommand = useCallback((command: string) => {
    clearTimers();
    setTranscript(command);
    setStatus("thinking");
    timersRef.current.push(window.setTimeout(() => finishCommand(command), 820));
  }, [clearTimers, finishCommand]);

  const startListening = useCallback(() => {
    clearTimers();
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setStatus("listening");
      setTranscript("");
      timersRef.current.push(window.setTimeout(() => runDemoCommand("Plan my day"), 1700));
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const spoken = event.results[0]?.[0]?.transcript || "";
      setStatus("thinking");
      setTranscript(spoken);
      timersRef.current.push(window.setTimeout(() => finishCommand(spoken), 650));
    };
    recognition.onerror = () => setStatus("unavailable");
    recognition.onend = () => {
      if (status === "listening") setStatus("ready");
    };
    recognitionRef.current = recognition;
    setTranscript("");
    setStatus("listening");
    recognition.start();
  }, [clearTimers, finishCommand, runDemoCommand, status]);

  const stopListening = useCallback(() => {
    clearTimers();
    recognitionRef.current?.stop();
    setStatus("ready");
  }, [clearTimers]);

  const toggleListening = () => {
    if (status === "listening") stopListening();
    else startListening();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" && event.target === document.body) {
        event.preventDefault();
        toggleListening();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const isActive = status === "listening" || status === "thinking";

  return (
    <main className="echo-shell">
      <header className="topbar">
        <div className="brand-lockup" aria-label="Echo home">
          <div className="brand-mark"><Waves size={18} strokeWidth={2.1} /></div>
          <span>echo</span>
        </div>
        <nav className="topnav" aria-label="Primary navigation">
          <button className="topnav-link active">Overview</button>
          <button className="topnav-link" onClick={onOpenRoutines}>Routines</button>
          <button className="topnav-link">Preferences</button>
        </nav>
        <div className="topbar-actions">
          <button className="icon-button" aria-label="Search"><Search size={18} /></button>
          <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><span /></button>
          <div className="profile-chip"><span className="avatar">M</span><span className="profile-name">Maia</span><ChevronDown size={14} /></div>
        </div>
      </header>

      <div className="page-wrap">
        <section className="welcome-row">
          <div>
            <p className="eyebrow">Tuesday, November 9, 2026 <span className="eyebrow-dot" /> 9:24 AM</p>
            <h1>Good morning, <em>Maia.</em></h1>
            <p className="welcome-copy">A little clarity can change the shape of a whole day.</p>
          </div>
          <div className="system-status"><span className="status-dot" /> All systems operational <button aria-label="More system details"><MoreHorizontal size={16} /></button></div>
        </section>

        <section className="dashboard-grid">
          <div className="assistant-column">
            <div className={`listen-card ${isActive ? "is-active" : ""} ${status === "responding" ? "is-responding" : ""}`}>
              <div className="card-kicker"><span className="kicker-icon"><Sparkles size={15} /></span> Your personal assistant</div>
              <div className="listen-content">
                <div className="orb-wrap">
                  <div className="orb-ring orb-ring-one" />
                  <div className="orb-ring orb-ring-two" />
                  <div className="orb-ring orb-ring-three" />
                  <button className={`voice-orb ${isActive ? "voice-orb-active" : ""}`} onClick={toggleListening} aria-label={status === "listening" ? "Stop listening" : "Start listening"}>
                    {status === "listening" ? <Pause size={31} fill="currentColor" strokeWidth={1.6} /> : status === "thinking" ? <Sparkles className="thinking-icon" size={31} strokeWidth={1.6} /> : <Mic size={31} strokeWidth={1.7} />}
                  </button>
                </div>
                <div className="listen-status" aria-live="polite">
                  <p className="status-label">{statusCopy[status].label}</p>
                  <p className="status-helper">{statusCopy[status].helper}</p>
                  <div className={`waveform ${isActive ? "waveform-live" : ""}`} aria-hidden="true">
                    {[18, 30, 46, 26, 38, 20, 52, 28, 42, 24, 34, 18].map((height, index) => <i key={index} style={{ height: `${height}px`, animationDelay: `${index * 70}ms` }} />)}
                  </div>
                </div>
              </div>
              <div className="listen-footer">
                <span><Command size={13} /> Space to speak</span>
                <button className="text-button" onClick={() => setStatus("unavailable")}>Need help <ArrowUpRight size={14} /></button>
              </div>
            </div>

            <div className="response-card">
              <div className="response-header"><div className="response-title"><span className="mini-echo"><Waves size={13} /></span><span>Echo's response</span></div><span className="response-state"><span className="response-dot" /> Live</span></div>
              <div className="conversation-block">
                {transcript ? <div className="user-bubble"><span className="bubble-label">You said</span><p>“{transcript}”</p></div> : <div className="empty-conversation"><SquarePen size={18} /><span>Your next thought will appear here.</span></div>}
                <div className="assistant-reply"><span className="reply-avatar"><Waves size={14} /></span><p>{assistantReply}</p></div>
              </div>
              <div className="response-actions"><button onClick={() => runDemoCommand("Tell me something useful")}>Ask a follow-up <ArrowUpRight size={14} /></button><button aria-label="Adjust voice settings"><Settings2 size={16} /></button></div>
            </div>
          </div>

          <aside className="side-column">
            <div className="section-heading"><div><p className="eyebrow">Make it yours</p><h2>Try saying…</h2></div><button className="icon-button soft" aria-label="Add shortcut"><Plus size={17} /></button></div>
            <div className="quick-actions">
              {quickActions.map(({ label, icon: Icon, prompt, tint }) => <button key={label} className="quick-action" onClick={() => runDemoCommand(prompt)}><span className={`quick-icon ${tint}`}><Icon size={18} strokeWidth={1.8} /></span><span>{label}</span><ArrowUpRight size={15} className="quick-arrow" /></button>)}
            </div>

            <div className="section-heading activity-heading"><div><p className="eyebrow">A look back</p><h2>Recent activity</h2></div><button className="view-all" onClick={() => setShowAll((value) => !value)}>{showAll ? "Show less" : "View all"}</button></div>
            <div className="activity-list">
              {visibleActivity.map((item) => <div className="activity-item" key={item.id}><span className={`activity-icon ${item.tone}`}><ActivityIcon type={item.icon} /></span><div className="activity-copy"><p>{item.command}</p><span>{item.result}</span></div><time>{item.time}</time></div>)}
            </div>
            <button className="activity-add" onClick={onCreateRoutine}><Plus size={15} /> Create a routine</button>
          </aside>
        </section>

        <section className="bottom-strip">
          <div className="focus-note"><span className="note-icon"><Coffee size={17} /></span><div><p className="note-eyebrow">A small nudge</p><p className="note-text">You have 2 hours of focus time before lunch.</p></div><button className="note-action" onClick={() => runDemoCommand("Block two hours for focus time")}>Make space <ArrowUpRight size={14} /></button></div>
          <div className="mini-player"><span className="player-art"><Headphones size={16} /></span><div><span className="player-label">Currently queued</span><p>Soft focus · 42 min</p></div><button onClick={() => setIsPlaying((value) => !value)} aria-label={isPlaying ? "Pause focus mix" : "Play focus mix"}>{isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</button><Volume2 size={16} className="player-volume" /></div>
        </section>

        <footer className="footer-note"><span>echo / 01</span><span>Designed for the in-between moments.</span><span className="footer-right"><Clock3 size={13} /> Your data stays yours</span></footer>
      </div>
    </main>
  );
}
