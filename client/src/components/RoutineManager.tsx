import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Edit3,
  ListChecks,
  MoreHorizontal,
  Music2,
  Pause,
  Plus,
  Sparkles,
  Trash2,
  Volume2,
  Waves,
} from "lucide-react";

type RoutineTone = "peach" | "lavender" | "sage" | "blue";
type RoutineIcon = "calendar" | "music" | "check" | "sparkles";

type Routine = {
  id: number;
  name: string;
  command: string;
  repeat: "Every day" | "Weekdays" | "Weekends" | "Custom";
  days: number[];
  time: string;
  enabled: boolean;
  nextRun: string;
  lastRun: string;
  tone: RoutineTone;
  icon: RoutineIcon;
};

type RoutineDraft = Pick<Routine, "name" | "command" | "repeat" | "days" | "time">;

type RoutineManagerProps = {
  openRequest?: number;
  onBack: () => void;
};

const STORAGE_KEY = "echo-routines-v1";
const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
const fullDayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const tones: RoutineTone[] = ["peach", "lavender", "sage", "blue"];
const icons: RoutineIcon[] = ["calendar", "music", "check", "sparkles"];

const starterRoutines: Routine[] = [
  { id: 101, name: "Morning brief", command: "Read my calendar and weather", repeat: "Weekdays", days: [0, 1, 2, 3, 4], time: "08:00", enabled: true, nextRun: "Tomorrow at 8:00 AM", lastRun: "Today, 8:00 AM", tone: "peach", icon: "calendar" },
  { id: 102, name: "Wind-down mix", command: "Play my evening focus mix", repeat: "Every day", days: [0, 1, 2, 3, 4, 5, 6], time: "21:30", enabled: true, nextRun: "Today at 9:30 PM", lastRun: "Yesterday, 9:30 PM", tone: "lavender", icon: "music" },
  { id: 103, name: "Stretch break", command: "Remind me to stretch and refill my water", repeat: "Custom", days: [0, 2, 4], time: "15:00", enabled: false, nextRun: "Paused", lastRun: "Monday, 3:00 PM", tone: "sage", icon: "check" },
];

function readRoutines() {
  if (typeof window === "undefined") return starterRoutines;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Routine[]) : starterRoutines;
  } catch {
    return starterRoutines;
  }
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

function routineSchedule(routine: Routine) {
  if (routine.repeat !== "Custom") return routine.repeat;
  if (routine.days.length === 0) return "Choose days";
  return routine.days.map((day) => fullDayLabels[day].slice(0, 3)).join(" · ");
}

function RoutineIcon({ type }: { type: RoutineIcon }) {
  if (type === "calendar") return <CalendarDays size={19} strokeWidth={1.8} />;
  if (type === "music") return <Music2 size={19} strokeWidth={1.8} />;
  if (type === "check") return <Check size={19} strokeWidth={2} />;
  return <Sparkles size={19} strokeWidth={1.8} />;
}

const emptyDraft: RoutineDraft = { name: "", command: "", repeat: "Weekdays", days: [0, 1, 2, 3, 4], time: "08:00" };

export default function RoutineManager({ openRequest = 0, onBack }: RoutineManagerProps) {
  const [routines, setRoutines] = useState<Routine[]>(readRoutines);
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<RoutineDraft>(emptyDraft);
  const lastOpenRequest = useRef(openRequest);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(routines));
  }, [routines]);

  useEffect(() => {
    if (openRequest !== lastOpenRequest.current) {
      lastOpenRequest.current = openRequest;
      if (openRequest > 0) openNewRoutine();
    }
  }, [openRequest]);

  const activeCount = routines.filter((routine) => routine.enabled).length;
  const nextRoutine = routines.find((routine) => routine.enabled);
  const savedCount = routines.length * 3 + activeCount;
  const weekdayCount = routines.filter((routine) => routine.repeat === "Weekdays").length;

  const editorTitle = editingId === null ? "New routine" : "Edit routine";

  function openNewRoutine() {
    setEditingId(null);
    setDraft(emptyDraft);
    setShowEditor(true);
  }

  function openEditRoutine(routine: Routine) {
    setEditingId(routine.id);
    setDraft({ name: routine.name, command: routine.command, repeat: routine.repeat, days: routine.days, time: routine.time });
    setShowEditor(true);
  }

  function closeEditor() {
    setShowEditor(false);
    setEditingId(null);
    setDraft(emptyDraft);
  }

  function saveRoutine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draft.name.trim();
    const command = draft.command.trim();
    if (!name || !command || (draft.repeat === "Custom" && draft.days.length === 0)) return;

    if (editingId !== null) {
      setRoutines((current) => current.map((routine) => routine.id === editingId ? {
        ...routine,
        ...draft,
        nextRun: routine.enabled ? `Next at ${formatTime(draft.time)}` : "Paused",
      } : routine));
    } else {
      const newRoutine: Routine = {
        id: Date.now(),
        ...draft,
        enabled: true,
        nextRun: `Next at ${formatTime(draft.time)}`,
        lastRun: "Never run",
        tone: tones[routines.length % tones.length],
        icon: icons[routines.length % icons.length],
      };
      setRoutines((current) => [newRoutine, ...current]);
    }
    closeEditor();
  }

  function toggleRoutine(id: number) {
    setRoutines((current) => current.map((routine) => {
      if (routine.id !== id) return routine;
      const enabled = !routine.enabled;
      return { ...routine, enabled, nextRun: enabled ? `Next at ${formatTime(routine.time)}` : "Paused" };
    }));
  }

  function deleteRoutine(id: number) {
    setRoutines((current) => current.filter((routine) => routine.id !== id));
    if (editingId === id) closeEditor();
  }

  function toggleDay(index: number) {
    setDraft((current) => ({
      ...current,
      days: current.days.includes(index) ? current.days.filter((day) => day !== index) : [...current.days, index].sort(),
    }));
  }

  return (
    <section className="routine-page">
      <div className="routine-page-header">
        <div>
          <button className="back-link" onClick={onBack}><ArrowLeft size={14} /> Back to overview</button>
          <p className="eyebrow">Your personal shortcuts</p>
          <h1>Routines that <em>remember.</em></h1>
          <p className="routine-intro">Give Echo a command once, then let it carry the rhythm for you.</p>
        </div>
        <button className="primary-action" onClick={openNewRoutine}><Plus size={17} /> New routine</button>
      </div>

      <div className="routine-stats">
        <div className="routine-stat"><span className="stat-icon peach"><Waves size={17} /></span><div><strong>{activeCount}</strong><span>active routines</span></div></div>
        <div className="routine-stat"><span className="stat-icon sage"><Clock3 size={17} /></span><div><strong>{savedCount}</strong><span>moments saved this week</span></div></div>
        <div className="routine-stat"><span className="stat-icon lavender"><CalendarDays size={17} /></span><div><strong>{nextRoutine ? formatTime(nextRoutine.time) : "—"}</strong><span>next up</span></div></div>
        <div className="routine-stat stat-note"><Volume2 size={16} /><span>Echo will always ask before a new routine runs for the first time.</span></div>
      </div>

      <div className="routine-list-header"><div><p className="eyebrow">Your rhythm</p><h2>{routines.length} custom routines</h2></div><span className="routine-filter"><ListChecks size={14} /> {weekdayCount} weekday {weekdayCount === 1 ? "routine" : "routines"}</span></div>

      <div className="routine-list">
        {routines.length === 0 ? <div className="routine-empty"><span className="empty-spark"><Sparkles size={20} /></span><h3>Start with one small ritual.</h3><p>Create a recurring voice command and let Echo keep it moving.</p><button className="primary-action" onClick={openNewRoutine}><Plus size={16} /> Create your first routine</button></div> : routines.map((routine) => <article className={`routine-card ${routine.enabled ? "" : "is-paused"}`} key={routine.id}>
          <span className={`routine-icon ${routine.tone}`}><RoutineIcon type={routine.icon} /></span>
          <div className="routine-main"><div className="routine-title-row"><h3>{routine.name}</h3><span className={`routine-badge ${routine.enabled ? "on" : "off"}`}>{routine.enabled ? "Active" : "Paused"}</span></div><p className="routine-command">“{routine.command}”</p><div className="routine-meta"><span><Clock3 size={13} /> {formatTime(routine.time)}</span><span><CalendarDays size={13} /> {routineSchedule(routine)}</span><span className="last-run">Last run: {routine.lastRun}</span></div></div>
          <div className="routine-next"><span>Next run</span><strong>{routine.nextRun}</strong></div>
          <button className={`routine-toggle ${routine.enabled ? "is-on" : ""}`} role="switch" aria-checked={routine.enabled} aria-label={`${routine.enabled ? "Pause" : "Enable"} ${routine.name}`} onClick={() => toggleRoutine(routine.id)}><span /></button>
          <div className="routine-menu"><button aria-label={`Edit ${routine.name}`} onClick={() => openEditRoutine(routine)}><Edit3 size={15} /></button><button aria-label={`Delete ${routine.name}`} onClick={() => deleteRoutine(routine.id)}><Trash2 size={15} /></button><button aria-label="More routine options"><MoreHorizontal size={16} /></button></div>
        </article>)}
      </div>

      <div className="routine-tip"><span className="tip-mark"><Sparkles size={15} /></span><div><strong>Make it sound like you.</strong><p>Try commands like “Every weekday at 8, read my priorities” or “On Sundays, remind me to plan the week.”</p></div><ArrowUpRight size={16} /></div>

      {showEditor && <div className="routine-editor-backdrop" role="presentation"><div className="routine-editor" role="dialog" aria-modal="true" aria-labelledby="routine-editor-title"><div className="editor-header"><div><p className="eyebrow">Customize your shortcut</p><h2 id="routine-editor-title">{editorTitle}</h2></div><button className="editor-close" onClick={closeEditor} aria-label="Close routine editor"><Pause size={15} /></button></div><form onSubmit={saveRoutine}><label>Routine name<input autoFocus value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Monday reset" /></label><label>What should Echo say or do?<textarea value={draft.command} onChange={(event) => setDraft({ ...draft, command: event.target.value })} placeholder="e.g. Read my priorities and open my focus mix" rows={3} /></label><div className="editor-grid"><label>Repeats<select value={draft.repeat} onChange={(event) => setDraft({ ...draft, repeat: event.target.value as RoutineDraft["repeat"] })}><option>Every day</option><option>Weekdays</option><option>Weekends</option><option>Custom</option></select><ChevronDown size={15} /></label><label>At <input type="time" value={draft.time} onChange={(event) => setDraft({ ...draft, time: event.target.value })} /></label></div>{draft.repeat === "Custom" && <div className="day-picker"><span>On these days</span><div>{dayLabels.map((label, index) => <button type="button" key={`${label}-${index}`} className={draft.days.includes(index) ? "selected" : ""} onClick={() => toggleDay(index)} aria-label={fullDayLabels[index]} aria-pressed={draft.days.includes(index)}>{label}</button>)}</div></div>}<div className="editor-footer"><button type="button" className="secondary-action" onClick={closeEditor}>Cancel</button><button type="submit" className="primary-action"><Check size={16} /> {editingId === null ? "Add routine" : "Save changes"}</button></div></form></div></div>}
    </section>
  );
}
