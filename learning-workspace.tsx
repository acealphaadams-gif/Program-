import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine, ArrowRight, BookOpen, Brain, CalendarDays, Check,
  CheckCircle2, ChevronRight, CircleHelp, ClipboardCheck, FileText,
  GraduationCap, Layers, Lightbulb, Plus, RotateCcw, Sparkles, Target,
  Trash2, Trophy, Pencil, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/learning-workspace")({
  head: () => ({ meta: [
    { title: "Learning Workspace — Alpha AI" },
    { name: "description", content: "Plan learning, create revision notes, practise with flashcards and track your study goals with Alpha AI." },
  ] }),
  component: LearningWorkspace,
});

type Note = { id: string; title: string; subject: string; body: string; updatedAt: string };
type Goal = { id: string; title: string; done: boolean };
type Card = { id: string; front: string; back: string; subject: string };
type QuizQuestion = { question: string; options: string[]; answer: number; explanation: string };
type Tab = "overview" | "plan" | "notes" | "flashcards" | "practice" | "resources";
const KEY = "alpha-learning-workspace-v2";
const subjects = ["General study", "Mathematics", "English", "Biology", "Chemistry", "Physics", "Geography", "History", "ICT / Computing", "Other"];
const starterGoals: Goal[] = [
  { id: "goal-review", title: "Review one topic from class", done: false },
  { id: "goal-practice", title: "Practise five questions", done: false },
  { id: "goal-recall", title: "Recall key ideas without looking at notes", done: false },
];
const starterCards: Card[] = [
  { id: "fc1", subject: "Biology", front: "What is photosynthesis?", back: "The process by which green plants use light energy to make glucose from carbon dioxide and water, releasing oxygen." },
  { id: "fc2", subject: "Mathematics", front: "What is the order of operations?", back: "Brackets, indices, division and multiplication from left to right, then addition and subtraction from left to right." },
  { id: "fc3", subject: "English", front: "What is a verb?", back: "A word or group of words that expresses an action, occurrence or state of being." },
];
const sampleQuiz: QuizQuestion[] = [
  { question: "Which study method best checks whether you can recall a concept independently?", options: ["Rereading the same paragraph repeatedly", "Active recall without looking at notes", "Highlighting every sentence", "Copying a page word for word"], answer: 1, explanation: "Active recall asks you to retrieve information from memory. Check your answer afterwards and revisit gaps." },
  { question: "What is a useful next step after getting a practice question wrong?", options: ["Ignore it and move on", "Memorise the letter only", "Review the reasoning, correct the gap and try a similar question", "Stop studying the subject"], answer: 2, explanation: "Understanding the error and attempting a similar question helps turn feedback into learning." },
  { question: "How should you use a revision plan?", options: ["Keep it fixed even when priorities change", "Use small goals and adjust them as you learn", "Study every topic for the same time regardless of need", "Avoid checking progress"], answer: 1, explanation: "A plan is most useful when goals are manageable and adjusted to your progress and upcoming work." },
];
function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const value = window.localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}
function makeId() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function LearningWorkspace() {
  const [goals, setGoals] = useState<Goal[]>(() => read(`${KEY}:goals`, starterGoals));
  const [notes, setNotes] = useState<Note[]>(() => read(`${KEY}:notes`, []));
  const [cards, setCards] = useState<Card[]>(() => read(`${KEY}:cards`, starterCards));
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [newGoal, setNewGoal] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteSubject, setNoteSubject] = useState("General study");
  const [noteBody, setNoteBody] = useState("");
  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");
  const [cardSubject, setCardSubject] = useState("General study");
  const [cardIndex, setCardIndex] = useState(0);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizFinished, setQuizFinished] = useState(false);
  const [resourceQuery, setResourceQuery] = useState("");
  const [storageWarning, setStorageWarning] = useState(false);
  const today = useMemo(() => new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date()), []);

  useEffect(() => {
    try {
      localStorage.setItem(`${KEY}:goals`, JSON.stringify(goals));
      localStorage.setItem(`${KEY}:notes`, JSON.stringify(notes));
      localStorage.setItem(`${KEY}:cards`, JSON.stringify(cards));
      setStorageWarning(false);
    } catch { setStorageWarning(true); }
  }, [goals, notes, cards]);

  const completed = goals.filter((goal) => goal.done).length;
  const progress = goals.length ? Math.round(completed / goals.length * 100) : 0;
  const quizScore = quizAnswers.reduce((score, answer, index) => score + (answer === sampleQuiz[index]?.answer ? 1 : 0), 0);
  const currentCard = cards.length ? cards[((cardIndex % cards.length) + cards.length) % cards.length] : undefined;
  const filteredNotes = notes.filter((note) => `${note.title} ${note.subject} ${note.body}`.toLowerCase().includes(resourceQuery.toLowerCase()));

  function saveNote() {
    if (!noteTitle.trim() || !noteBody.trim()) return;
    const updatedAt = new Date().toISOString();
    if (editingNoteId) {
      setNotes((previous) => previous.map((note) => note.id === editingNoteId
        ? { ...note, title: noteTitle.trim(), subject: noteSubject, body: noteBody.trim(), updatedAt }
        : note));
    } else {
      setNotes((previous) => [{ id: makeId(), title: noteTitle.trim(), subject: noteSubject, body: noteBody.trim(), updatedAt }, ...previous]);
    }
    setNoteTitle(""); setNoteBody(""); setNoteSubject("General study"); setEditingNoteId(null); setActiveTab("notes");
  }
  function editNote(note: Note) {
    setEditingNoteId(note.id); setNoteTitle(note.title); setNoteSubject(note.subject); setNoteBody(note.body); setActiveTab("notes");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function cancelNoteEdit() {
    setEditingNoteId(null); setNoteTitle(""); setNoteBody(""); setNoteSubject("General study");
  }
  function downloadText(filename: string, content: string, type = "text/plain;charset=utf-8") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportNote(note: Note) {
    downloadText(`${safeFilename(note.title)}.md`, `# ${note.title}\n\n**Subject:** ${note.subject}\n\n${note.body}\n`, "text/markdown;charset=utf-8");
  }
  function addGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!newGoal.trim()) return;
    setGoals((previous) => [...previous, { id: makeId(), title: newGoal.trim(), done: false }]); setNewGoal("");
  }
  function addFlashcard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!cardFront.trim() || !cardBack.trim()) return;
    setCards((previous) => [...previous, { id: makeId(), front: cardFront.trim(), back: cardBack.trim(), subject: cardSubject }]);
    setCardFront(""); setCardBack(""); setCardIndex(cards.length); setCardRevealed(false);
  }
  function startQuiz() { setQuizIndex(0); setQuizAnswers([]); setQuizFinished(false); setActiveTab("practice"); }
  function chooseAnswer(option: number) {
    if (quizAnswers[quizIndex] !== undefined) return;
    setQuizAnswers((previous) => [...previous, option]);
  }
  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <Layers className="h-4 w-4" /> },
    { id: "plan", label: "Study plan", icon: <Target className="h-4 w-4" /> },
    { id: "notes", label: "My notes", icon: <FileText className="h-4 w-4" /> },
    { id: "flashcards", label: "Flashcards", icon: <Brain className="h-4 w-4" /> },
    { id: "practice", label: "Practice quiz", icon: <ClipboardCheck className="h-4 w-4" /> },
    { id: "resources", label: "Resources", icon: <BookOpen className="h-4 w-4" /> },
  ];

  return <main className="min-h-dvh bg-background text-foreground">
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-7">
        <Link to="/chat/$threadId" params={{ threadId: "learn-alpha" }} className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-teal-600 text-white shadow-sm"><GraduationCap className="h-6 w-6" /></span>
          <span className="min-w-0"><span className="block font-display text-base font-bold tracking-tight">Alpha AI</span><span className="block truncate text-xs text-muted-foreground">Your Friendly Tutor · Learning Workspace</span></span>
        </Link>
        <div className="flex items-center gap-2"><span className="hidden items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-800 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-teal-500" /> Workspace on this device</span><Link to="/chat/$threadId" params={{ threadId: "learn-alpha" }}><Button variant="brand" size="sm"><Sparkles className="mr-2 h-4 w-4" /> Ask Alpha</Button></Link></div>
      </div>
    </header>

    <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 sm:px-7 sm:py-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="h-fit rounded-2xl border border-border bg-card p-3 shadow-sm lg:sticky lg:top-24">
        <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Your workspace</p>
        <nav className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1" aria-label="Learning workspace sections">
          {navItems.map((item) => <button key={item.id} type="button" onClick={() => setActiveTab(item.id)} aria-current={activeTab === item.id ? "page" : undefined} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeTab === item.id ? "bg-gradient-to-r from-cyan-50 to-teal-50 font-semibold text-teal-900 ring-1 ring-teal-100" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{item.icon}<span>{item.label}</span></button>)}
        </nav>
        <div className="mt-4 rounded-xl bg-gradient-to-br from-cyan-50 via-sky-50 to-teal-50 p-3.5 text-slate-700"><Lightbulb className="h-5 w-5 text-teal-700" /><p className="mt-2 text-sm font-semibold">A gentle reminder</p><p className="mt-1 text-xs leading-relaxed">Short, focused study sessions and active recall can help you learn steadily.</p></div>
      </aside>

      <section className="min-w-0">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="mb-1.5 text-sm font-medium text-teal-700">{today}</p><h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{tabTitle(activeTab)}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">A calm place to plan, practise, organise your notes and build confidence one topic at a time.</p></div>
          <Button variant="outline" className="w-fit border-teal-200 bg-white hover:bg-teal-50" onClick={() => downloadText("alpha-study-summary.md", `# Alpha AI Learning Summary\n\nGoals completed: ${completed}/${goals.length}\nSaved notes: ${notes.length}\nFlashcards: ${cards.length}\n\n## Goals\n${goals.map((goal) => `- [${goal.done ? "x" : " "}] ${goal.title}`).join("\n")}\n\n## Notes\n${notes.map((note) => `- ${note.title} (${note.subject})`).join("\n") || "No notes saved yet."}\n` , "text/markdown;charset=utf-8")}><ArrowDownToLine className="mr-2 h-4 w-4" /> Export summary</Button>
        </div>
        {storageWarning && <div role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Your browser could not save some changes. Check device storage or browser privacy settings before leaving this page.</div>}

        {activeTab === "overview" && <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat icon={<Target className="h-4 w-4" />} label="Today's goals" value={`${completed}/${goals.length}`} sub={`${progress}% checklist complete`} />
            <Stat icon={<FileText className="h-4 w-4" />} label="Saved notes" value={String(notes.length)} sub="Saved in this browser" />
            <Stat icon={<Brain className="h-4 w-4" />} label="Flashcards" value={String(cards.length)} sub="Ready for active recall" />
            <Stat icon={<Trophy className="h-4 w-4" />} label="Quiz practice" value="Try a quick quiz" sub="Scores shown for this session only" />
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-lg font-semibold">Today's learning goals</h2><p className="mt-1 text-sm text-muted-foreground">Choose a few realistic actions you can finish.</p></div><span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-bold text-teal-800">{progress}%</span></div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-cyan-50"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>
              <ul className="mt-4 space-y-2">{goals.map((goal) => <li key={goal.id} className="flex items-center gap-3 rounded-xl border border-border/80 p-3"><input type="checkbox" checked={goal.done} onChange={(event) => setGoals((previous) => previous.map((item) => item.id === goal.id ? { ...item, done: event.target.checked } : item))} aria-label={`Mark ${goal.title} complete`} className="h-4 w-4 shrink-0 accent-teal-600" /><span className={`min-w-0 flex-1 text-sm ${goal.done ? "text-muted-foreground line-through" : ""}`}>{goal.title}</span><button type="button" onClick={() => setGoals((previous) => previous.filter((item) => item.id !== goal.id))} aria-label={`Delete goal ${goal.title}`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Trash2 className="h-4 w-4" /></button></li>)}</ul>
              <form className="mt-4 flex gap-2" onSubmit={addGoal}><input value={newGoal} onChange={(event) => setNewGoal(event.target.value)} placeholder="Add a goal for today…" maxLength={120} aria-label="New learning goal" className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /><Button type="submit" variant="outline" size="icon" aria-label="Add goal"><Plus className="h-4 w-4" /></Button></form>
            </section>
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><h2 className="font-display text-lg font-semibold">Continue learning</h2><p className="mt-1 text-sm text-muted-foreground">Jump into a useful next activity.</p><div className="mt-4 space-y-2.5">
              <ActionRow icon={<BookOpen />} title="Study with Alpha" detail="Get a step-by-step explanation" onClick={() => openTutor("Teach me a topic from the Uganda curriculum step by step. Start by asking my level and subject.")} />
              <ActionRow icon={<Brain />} title="Practise a topic" detail="Ask for questions with explanations" onClick={() => openTutor("Create a short practice quiz for me. Ask my education level, subject and topic first, then explain each answer.")} />
              <ActionRow icon={<FileText />} title="Create revision notes" detail="Write and save key ideas" onClick={() => setActiveTab("notes")} />
              <ActionRow icon={<Layers />} title="Review flashcards" detail={`${cards.length} cards ready`} onClick={() => setActiveTab("flashcards")} />
            </div><div className="mt-4 rounded-xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-teal-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-teal-900"><CalendarDays className="h-4 w-4" /> Revision tip</div><p className="mt-2 text-sm leading-relaxed text-slate-700">Try recalling the main ideas from memory, then check your notes and revisit anything unclear.</p></div></section>
          </div>
        </>}

        {activeTab === "plan" && <div className="grid gap-5 xl:grid-cols-[1fr_.8fr]">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><h2 className="font-display text-lg font-semibold">Build your study plan</h2><p className="mt-1 text-sm text-muted-foreground">Make a short checklist for the topics you want to work on. You can update it any time.</p><form className="mt-4 flex gap-2" onSubmit={addGoal}><input value={newGoal} onChange={(event) => setNewGoal(event.target.value)} placeholder="e.g. Revise fractions and equivalent forms" maxLength={120} aria-label="New study plan task" className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"/><Button type="submit" variant="brand"><Plus className="mr-2 h-4 w-4"/>Add task</Button></form><div className="mt-5 space-y-2">{goals.length ? goals.map((goal, index) => <div key={goal.id} className="flex items-center gap-3 rounded-xl border border-border p-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-sm font-semibold text-teal-800">{index + 1}</span><input type="checkbox" checked={goal.done} onChange={(event) => setGoals((previous) => previous.map((item) => item.id === goal.id ? { ...item, done: event.target.checked } : item))} aria-label={`Complete ${goal.title}`} className="h-4 w-4 accent-teal-600"/><span className={`flex-1 text-sm ${goal.done ? "text-muted-foreground line-through" : ""}`}>{goal.title}</span><button type="button" aria-label={`Remove ${goal.title}`} onClick={() => setGoals((previous) => previous.filter((item) => item.id !== goal.id))} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="h-4 w-4"/></button></div>) : <Empty title="Your plan is clear" detail="Add a small learning task to get started."/>}</div></section>
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><h2 className="font-display text-lg font-semibold">Plan progress</h2><p className="mt-1 text-sm text-muted-foreground">Based only on the tasks you have entered.</p><div className="mt-5 flex items-center gap-4"><div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#0d9488 ${progress * 3.6}deg, #dff5f5 0deg)` }}><div className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-card text-xl font-bold">{progress}%</div></div><div><p className="font-semibold">{completed} of {goals.length} tasks complete</p><p className="mt-1 text-sm text-muted-foreground">{goals.length === 0 ? "Add your first task to begin." : completed === goals.length ? "Nice work. Choose the next topic when you're ready." : "Keep the next step small and manageable."}</p></div></div><Button variant="outline" className="mt-5 w-full" onClick={() => downloadText("alpha-study-plan.md", `# My Alpha AI Study Plan\n\nDate: ${today}\nProgress: ${progress}%\n\n${goals.map((goal) => `- [${goal.done ? "x" : " "}] ${goal.title}`).join("\n") || "No tasks added yet."}\n`, "text/markdown;charset=utf-8")}><ArrowDownToLine className="mr-2 h-4 w-4"/>Export study plan</Button><p className="mt-3 text-xs leading-relaxed text-muted-foreground">This is a personal checklist, not a calendar or automatic curriculum assessment. Ask Alpha to help organise topics into a weekly plan.</p><Button variant="brand" className="mt-3 w-full" onClick={() => openTutor("Help me make a realistic weekly study plan aligned with the Uganda curriculum. Ask my level, subjects, available study time and upcoming assessments first.")}><Sparkles className="mr-2 h-4 w-4"/>Plan with Alpha</Button></section>
        </div>}

        {activeTab === "notes" && <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><h2 className="font-display text-lg font-semibold">{editingNoteId ? "Edit study note" : "Create a study note"}</h2><p className="mt-1 text-sm text-muted-foreground">Your notes are saved locally in this browser.</p><form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); saveNote(); }}><label className="block text-sm font-medium">Title<input required value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} maxLength={140} placeholder="e.g. Fractions — key rules" className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"/></label><label className="block text-sm font-medium">Subject<select value={noteSubject} onChange={(event) => setNoteSubject(event.target.value)} className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm">{subjects.map((subject) => <option key={subject}>{subject}</option>)}</select></label><label className="block text-sm font-medium">Note content<textarea required value={noteBody} onChange={(event) => setNoteBody(event.target.value)} rows={8} maxLength={20000} placeholder="Definitions, key ideas, worked examples or questions to revisit…" className="mt-1.5 w-full resize-y rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"/></label><Button type="submit" variant="brand" className="w-full">{editingNoteId ? <Check className="mr-2 h-4 w-4"/> : <Plus className="mr-2 h-4 w-4"/>}{editingNoteId ? "Update note" : "Save note"}</Button>{editingNoteId && <Button type="button" variant="outline" className="w-full" onClick={cancelNoteEdit}><X className="mr-2 h-4 w-4"/>Cancel editing</Button>}</form></section><section className="min-w-0 space-y-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="font-display text-lg font-semibold">Your notes <span className="text-sm font-normal text-muted-foreground">({notes.length})</span></h2><input value={resourceQuery} onChange={(event) => setResourceQuery(event.target.value)} aria-label="Search notes" placeholder="Search your notes…" className="rounded-xl border border-input bg-card px-3 py-2 text-sm sm:max-w-56 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"/></div>{filteredNotes.length === 0 ? <Empty title={notes.length ? "No matching notes" : "Your notes will appear here"} detail={notes.length ? "Try a different search term." : "Create your first note using the form."} icon={<FileText className="h-8 w-8"/>}/> : filteredNotes.map((note) => <article key={note.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm"><div className="flex flex-wrap items-start gap-3"><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-teal-700">{note.subject}</p><h3 className="mt-1 font-semibold">{note.title}</h3><p className="mt-1 text-xs text-muted-foreground">Updated {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(note.updatedAt))}</p><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{note.body}</p></div><div className="flex shrink-0 gap-1"><Button variant="outline" size="sm" onClick={() => editNote(note)} aria-label={`Edit ${note.title}`}><Pencil className="mr-1.5 h-3.5 w-3.5"/>Edit</Button><Button variant="outline" size="sm" onClick={() => exportNote(note)} aria-label={`Export ${note.title}`}><ArrowDownToLine className="mr-1.5 h-3.5 w-3.5"/>Export</Button><Button variant="ghost" size="icon" onClick={() => { setNotes((previous) => previous.filter((item) => item.id !== note.id)); if (editingNoteId === note.id) cancelNoteEdit(); }} aria-label={`Delete note ${note.title}`}><Trash2 className="h-4 w-4"/></Button></div></div></article>)}</section></div>}

        {activeTab === "flashcards" && <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]"><section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="font-display text-lg font-semibold">Recall practice</h2><p className="mt-1 text-sm text-muted-foreground">Try answering before revealing the back.</p></div><span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-teal-800">{cards.length ? `${((cardIndex % cards.length) + cards.length) % cards.length + 1} / ${cards.length}` : "0 cards"}</span></div>{currentCard ? <><button type="button" onClick={() => setCardRevealed((previous) => !previous)} className="mt-5 flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-teal-50 p-6 text-center transition hover:border-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-teal-800 shadow-sm">{currentCard.subject}</span><span className="mt-5 max-w-lg text-xl font-semibold leading-relaxed text-slate-800">{cardRevealed ? currentCard.back : currentCard.front}</span><span className="mt-5 text-xs text-teal-700">{cardRevealed ? "Answer · tap to see question" : "Question · tap to reveal answer"}</span></button><div className="mt-4 flex flex-wrap justify-between gap-2"><Button variant="outline" onClick={() => { setCardIndex((previous) => previous - 1); setCardRevealed(false); }}><ChevronRight className="mr-2 h-4 w-4 rotate-180"/>Previous</Button><Button variant="outline" onClick={() => setCardRevealed((previous) => !previous)}>{cardRevealed ? "Show question" : "Reveal answer"}</Button><Button variant="brand" onClick={() => { setCardIndex((previous) => previous + 1); setCardRevealed(false); }}>Next card<ChevronRight className="ml-2 h-4 w-4"/></Button></div></> : <Empty title="No flashcards yet" detail="Create a question and answer to start practising."/>}</section><section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><h2 className="font-display text-lg font-semibold">Create a flashcard</h2><p className="mt-1 text-sm text-muted-foreground">Add your own prompts, definitions and explanations.</p><form className="mt-4 space-y-3" onSubmit={addFlashcard}><label className="block text-sm font-medium">Subject<select value={cardSubject} onChange={(event) => setCardSubject(event.target.value)} className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm">{subjects.map((subject) => <option key={subject}>{subject}</option>)}</select></label><label className="block text-sm font-medium">Front — question or prompt<textarea required value={cardFront} onChange={(event) => setCardFront(event.target.value)} rows={3} maxLength={1000} placeholder="What do you want to remember?" className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"/></label><label className="block text-sm font-medium">Back — answer or explanation<textarea required value={cardBack} onChange={(event) => setCardBack(event.target.value)} rows={4} maxLength={3000} placeholder="Write the answer in your own words…" className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"/></label><Button type="submit" variant="brand" className="w-full"><Plus className="mr-2 h-4 w-4"/>Add flashcard</Button></form><div className="mt-5 space-y-2"><h3 className="text-sm font-semibold">Your deck ({cards.length})</h3>{cards.map((card) => <div key={card.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5"><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{card.front}</span><span className="block text-xs text-muted-foreground">{card.subject}</span></span><button type="button" aria-label={`Delete flashcard ${card.front}`} onClick={() => { setCards((previous) => previous.filter((item) => item.id !== card.id)); setCardIndex(0); setCardRevealed(false); }} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="h-4 w-4"/></button></div>)}</div><Button variant="outline" className="mt-4 w-full" onClick={() => downloadText("alpha-flashcards.json", JSON.stringify(cards, null, 2), "application/json;charset=utf-8")}><ArrowDownToLine className="mr-2 h-4 w-4"/>Export flashcards</Button></section></div>}

        {activeTab === "practice" && <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8"><div className="mx-auto max-w-2xl">{!quizFinished ? <><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Quick learning check</p><h2 className="mt-1 font-display text-2xl font-semibold">Study skills mini-quiz</h2></div><span className="rounded-full bg-cyan-50 px-3 py-1 text-sm font-semibold text-teal-800">Question {quizIndex + 1} of {sampleQuiz.length}</span></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-cyan-50"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all" style={{ width: `${((quizIndex + 1) / sampleQuiz.length) * 100}%` }}/></div><h3 className="mt-7 text-lg font-semibold leading-relaxed">{sampleQuiz[quizIndex].question}</h3><div className="mt-4 space-y-2">{sampleQuiz[quizIndex].options.map((option, index) => <button type="button" key={option} disabled={quizAnswers[quizIndex] !== undefined} onClick={() => chooseAnswer(index)} className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${quizAnswers[quizIndex] === index ? "border-teal-400 bg-teal-50 text-teal-950" : "border-border hover:border-cyan-300 hover:bg-cyan-50/50"}`}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card font-semibold">{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>{quizAnswers[quizIndex] !== undefined && <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50 p-4"><p className="flex items-center gap-2 text-sm font-semibold text-teal-900"><CheckCircle2 className="h-4 w-4"/>{quizAnswers[quizIndex] === sampleQuiz[quizIndex].answer ? "Correct" : "Let's review this"}</p><p className="mt-1 text-sm leading-relaxed text-teal-950">{sampleQuiz[quizIndex].explanation}</p><Button variant="brand" className="mt-3" onClick={() => { if (quizIndex >= sampleQuiz.length - 1) setQuizFinished(true); else setQuizIndex((previous) => previous + 1); }}>{quizIndex >= sampleQuiz.length - 1 ? "See results" : "Next question"}<ArrowRight className="ml-2 h-4 w-4"/></Button></div>}<p className="mt-5 text-xs leading-relaxed text-muted-foreground">This short built-in quiz checks general study strategies, not mastery of a school subject. Results are kept only in this session.</p></> : <div className="py-8 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><Trophy className="h-7 w-7"/></span><h2 className="mt-4 font-display text-2xl font-semibold">Practice complete</h2><p className="mt-2 text-muted-foreground">You scored <strong className="text-foreground">{quizScore} out of {sampleQuiz.length}</strong> on this study-skills quiz.</p><p className="mt-2 text-sm text-muted-foreground">This is a session result, not a saved subject-mastery score.</p><div className="mt-5 flex flex-wrap justify-center gap-2"><Button variant="brand" onClick={startQuiz}><RotateCcw className="mr-2 h-4 w-4"/>Try again</Button><Button variant="outline" onClick={() => openTutor("Make a short quiz aligned with the Uganda curriculum. Ask me for my education level, subject and topic, and explain each answer.")}><Sparkles className="mr-2 h-4 w-4"/>Quiz with Alpha</Button></div></div>}</div></section>}

        {activeTab === "resources" && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><ResourceCard icon={<BookOpen/>} title="Learn a new topic" detail="Ask Alpha for a lesson matched to your level and subject." action="Start a lesson" onClick={() => openTutor("Teach me a topic aligned with the Uganda curriculum. First ask for my education level, subject and the topic I want to learn.")}/><ResourceCard icon={<CircleHelp/>} title="Get practice questions" detail="Generate questions and request explanations for each answer." action="Create practice" onClick={() => openTutor("Create practice questions aligned with the Uganda curriculum. Ask me for my level, subject and topic first, then give explanations after each answer.")}/><ResourceCard icon={<FileText/>} title="Organise your notes" detail="Keep revision notes in this workspace and export them as Markdown." action="Open notes" onClick={() => setActiveTab("notes")}/><ResourceCard icon={<Layers/>} title="Build a flashcard deck" detail="Create question-and-answer cards for active recall." action="Make flashcards" onClick={() => setActiveTab("flashcards")}/><ResourceCard icon={<CalendarDays/>} title="Plan revision" detail="Turn your goals into a personal checklist and export it." action="Open study plan" onClick={() => setActiveTab("plan")}/><ResourceCard icon={<Lightbulb/>} title="Review a difficult concept" detail="Ask for a simpler explanation and a worked example." action="Ask Alpha" onClick={() => openTutor("Help me understand a difficult concept. Ask which subject and topic, then explain it simply with an example and check my understanding.")}/><p className="text-xs leading-relaxed text-muted-foreground sm:col-span-2 xl:col-span-3">Resources and notes you create here are stored on this device. This page does not yet connect to a verified past-paper repository or cloud learning record.</p></div>}

        <footer className="mt-7 flex flex-col gap-2 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>Alpha AI Learning Workspace · Personal progress is based on your own entries.</span><span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-teal-700"/>Local saving enabled where browser storage permits</span></footer>
      </section>
    </div>
  </main>;
}
function tabTitle(tab: Tab) { return ({ overview: "Your learning space", plan: "Study plan", notes: "My notes", flashcards: "Flashcards", practice: "Practice quiz", resources: "Learning resources" })[tab]; }
function safeFilename(value: string) { return value.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "study-note"; }
function openTutor(prompt: string) {
  try { window.sessionStorage.setItem("alpha-learning-workspace:pending-prompt", prompt); } catch { /* navigation still works if storage is unavailable */ }
  window.location.assign("/chat/learn-alpha");
}
function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) { return <div className="rounded-2xl border border-border bg-card p-4 shadow-sm"><div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}<span>{label}</span></div><p className="mt-3 text-xl font-bold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{sub}</p></div>; }
function ActionRow({ icon, title, detail, onClick }: { icon: React.ReactNode; title: string; detail: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition hover:border-teal-200 hover:bg-cyan-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="rounded-xl bg-cyan-50 p-2.5 text-teal-800">{icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground"/></button>; }
function ResourceCard({ icon, title, detail, action, onClick }: { icon: React.ReactNode; title: string; detail: string; action: string; onClick: () => void }) { return <article className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-50 to-teal-50 text-teal-800">{icon}</span><h2 className="mt-4 font-display font-semibold">{title}</h2><p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{detail}</p><Button variant="outline" className="mt-4 w-full justify-between" onClick={onClick}>{action}<ArrowRight className="h-4 w-4"/></Button></article>; }
function Empty({ title, detail, icon }: { title: string; detail: string; icon?: React.ReactNode }) { return <div className="rounded-2xl border border-dashed border-border bg-card/70 p-10 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-teal-700">{icon ?? <FileText className="h-6 w-6"/>}</span><p className="mt-3 font-semibold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{detail}</p></div>; }
