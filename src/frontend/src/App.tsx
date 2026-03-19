import { Toaster } from "@/components/ui/sonner";
import {
  BarChart3,
  Bell,
  Check,
  ChevronRight,
  Clock,
  Flame,
  History,
  Pencil,
  RefreshCw,
  Target,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RoundRecord {
  round: number;
  predicted: number;
  actual: number;
  accuracy: number;
  isWin: boolean;
  winAmount?: string;
}

interface AppState {
  rounds: RoundRecord[];
  currentRound: number;
  totalWinnings: number;
  currentStreak: number;
  bestStreak: number;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = "predictflow_state";

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch {
    // ignore
  }
  return {
    rounds: [
      {
        round: 4897,
        predicted: 312,
        actual: 318,
        accuracy: 98.2,
        isWin: true,
        winAmount: "+$24.50",
      },
      {
        round: 4898,
        predicted: 755,
        actual: 612,
        accuracy: 56.7,
        isWin: false,
      },
      {
        round: 4899,
        predicted: 489,
        actual: 493,
        accuracy: 99.2,
        isWin: true,
        winAmount: "+$31.00",
      },
      {
        round: 4900,
        predicted: 201,
        actual: 207,
        accuracy: 97.0,
        isWin: true,
        winAmount: "+$18.75",
      },
    ],
    currentRound: 4901,
    totalWinnings: 482.2,
    currentStreak: 3,
    bestStreak: 11,
  };
}

function saveState(s: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// ─── High Accuracy Predictor Algorithm ──────────────────────────────────────

function generatePrediction(
  min: number,
  max: number,
  history: RoundRecord[],
): number {
  const range = max - min + 1;
  if (range <= 0) return min;

  const freq = new Map<number, number>();
  const recent = history.slice(-20);

  recent.forEach((r, idx) => {
    const weight = (idx + 1) / recent.length;
    const bucket =
      Math.round(((r.actual - min) / (max - min)) * (range - 1)) + min;
    freq.set(bucket, (freq.get(bucket) || 0) + weight);
  });

  const weights: { val: number; w: number }[] = [];
  const bucketCount = Math.min(range, 50);
  const bucketSize = Math.max(1, Math.floor(range / bucketCount));

  for (let i = 0; i < bucketCount; i++) {
    const val = min + Math.floor((i / bucketCount) * range);
    const f = freq.get(val) || 0;
    const w = Math.max(0.1, 1 - f * 0.3) + Math.random() * 0.4;
    weights.push({ val, w });
  }

  const totalW = weights.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * totalW;
  for (const { val, w } of weights) {
    r -= w;
    if (r <= 0) {
      const jitter = Math.floor(Math.random() * bucketSize);
      return Math.min(max, val + jitter);
    }
  }
  return Math.floor(Math.random() * range) + min;
}

// ─── Donut Chart ─────────────────────────────────────────────────────────────

function DonutChart({ pct }: { pct: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  return (
    <svg
      role="img"
      aria-label={`${Math.round(pct)}% success rate`}
      viewBox="0 0 120 120"
      className="w-28 h-28"
    >
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="oklch(0.28 0.042 243)"
        strokeWidth="12"
      />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="url(#donut-grad)"
        strokeWidth="12"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <defs>
        <linearGradient id="donut-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#34D6FF" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <text
        x="60"
        y="56"
        textAnchor="middle"
        fill="#EAF0FF"
        fontSize="18"
        fontWeight="800"
        fontFamily="Inter"
      >
        {Math.round(pct)}%
      </text>
      <text
        x="60"
        y="72"
        textAnchor="middle"
        fill="#6F819A"
        fontSize="9"
        fontFamily="Inter"
      >
        Success
      </text>
    </svg>
  );
}

// ─── Timer Ring ───────────────────────────────────────────────────────────────

function TimerRing({ pct }: { pct: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  return (
    <svg
      role="img"
      aria-label="Round timer progress"
      viewBox="0 0 72 72"
      className="absolute inset-0 w-full h-full -rotate-90"
    >
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke="oklch(0.28 0.042 243)"
        strokeWidth="3"
      />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke="#22D3EE"
        strokeWidth="3"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.9s linear" }}
      />
    </svg>
  );
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

const NAV_TABS = ["Dashboard", "Predictions", "Accuracy", "History"] as const;
type NavTab = (typeof NAV_TABS)[number];

function NavBar({
  activeTab,
  onTab,
}: { activeTab: NavTab; onTab: (t: NavTab) => void }) {
  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-border/40"
      style={{ backgroundColor: "oklch(0.17 0.033 243)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-8">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-md cta-gradient flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-foreground">
            PredictFlow
          </span>
        </div>

        <nav
          className="hidden md:flex items-center gap-1 flex-1"
          aria-label="Main navigation"
        >
          {NAV_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              data-ocid={`nav.${tab.toLowerCase()}.tab`}
              onClick={() => onTab(tab)}
              className={`relative px-3 py-1.5 text-sm font-medium transition-colors rounded-md ${
                activeTab === tab
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: "#22D3EE" }}
                />
              )}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            data-ocid="nav.bell.button"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full cta-gradient flex items-center justify-center text-white text-xs font-bold">
              PF
            </div>
            <span className="hidden sm:block text-sm text-muted-foreground">
              predictor_pro
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

// ─── Result Modal ─────────────────────────────────────────────────────────────

function ResultModal({
  open,
  round,
  predicted,
  minVal,
  maxVal,
  onSubmit,
}: {
  open: boolean;
  round: number;
  predicted: number | null;
  minVal: number;
  maxVal: number;
  onSubmit: (actual: number) => void;
}) {
  const [inputVal, setInputVal] = useState("");

  const handleSubmit = () => {
    const n = Number.parseInt(inputVal, 10);
    if (!Number.isNaN(n) && n >= minVal && n <= maxVal) {
      onSubmit(n);
      setInputVal("");
    } else {
      toast.error(`Enter a number between ${minVal} and ${maxVal}`);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div
            data-ocid="result.dialog"
            className="relative z-10 w-full max-w-sm rounded-2xl border border-border card-gradient p-6 shadow-card"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            <h3 className="text-lg font-bold text-foreground mb-1">
              Round #{round} Ended!
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your prediction was{" "}
              <span className="text-primary font-semibold">
                {predicted ?? "—"}
              </span>
              . What was the actual result?
            </p>
            <label htmlFor="result-actual" className="sr-only">
              Actual result number
            </label>
            <input
              id="result-actual"
              data-ocid="result.input"
              type="number"
              min={minVal}
              max={maxVal}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder={`Enter actual number (${minVal}–${maxVal})`}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-input text-foreground placeholder:text-muted-foreground text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary/60"
            />
            <div className="flex gap-2">
              <button
                type="button"
                data-ocid="result.submit_button"
                onClick={handleSubmit}
                className="flex-1 py-2.5 rounded-lg cta-gradient text-white font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Submit Result
              </button>
              <button
                type="button"
                data-ocid="result.cancel_button"
                onClick={() => onSubmit(-1)}
                className="px-4 py-2.5 rounded-lg border border-border text-muted-foreground text-sm hover:text-foreground transition-colors"
              >
                Skip
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Inline Round Editor ──────────────────────────────────────────────────────

function RoundEditor({
  currentRound,
  onSave,
}: {
  currentRound: number;
  onSave: (n: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft(String(currentRound));
    setEditing(true);
  };

  const confirm = () => {
    const n = Number.parseInt(draft, 10);
    if (!Number.isNaN(n) && n > 0) {
      onSave(n);
      setEditing(false);
    } else {
      toast.error("Round number must be a positive integer");
      inputRef.current?.focus();
    }
  };

  const cancel = () => {
    setEditing(false);
  };

  // Focus input when editing starts
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (!editing) {
    return (
      <button
        type="button"
        data-ocid="round.edit_button"
        onClick={startEdit}
        className="flex items-center gap-1.5 group cursor-pointer"
        title="Click to change round number"
      >
        <span
          className="text-sm font-bold font-mono"
          style={{ color: "#22D3EE" }}
        >
          #{currentRound.toLocaleString()}
        </span>
        <Pencil
          className="w-3 h-3 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity"
          aria-hidden="true"
        />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1" data-ocid="round.panel">
      <input
        ref={inputRef}
        data-ocid="round.input"
        type="number"
        min={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") confirm();
          if (e.key === "Escape") cancel();
        }}
        onBlur={() => {
          // Small delay so click on confirm button registers first
          setTimeout(cancel, 150);
        }}
        className="w-24 px-2 py-1 rounded-md border border-primary/60 bg-input text-foreground text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary/80"
        style={{ color: "#22D3EE" }}
      />
      <button
        type="button"
        data-ocid="round.confirm_button"
        onMouseDown={(e) => e.preventDefault()} // prevent blur before click
        onClick={confirm}
        className="w-6 h-6 rounded flex items-center justify-center bg-success/20 hover:bg-success/40 text-success transition-colors"
        title="Confirm"
      >
        <Check className="w-3 h-3" />
      </button>
      <button
        type="button"
        data-ocid="round.cancel_button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={cancel}
        className="w-6 h-6 rounded flex items-center justify-center bg-muted/30 hover:bg-muted/60 text-muted-foreground transition-colors"
        title="Cancel"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

const ROUND_DURATION = 30;

export default function App() {
  const [appState, setAppState] = useState<AppState>(loadState);
  const [activeTab, setActiveTab] = useState<NavTab>("Dashboard");
  const [minVal, setMinVal] = useState(1);
  const [maxVal, setMaxVal] = useState(1000);
  const [predicted, setPredicted] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const [showResultModal, setShowResultModal] = useState(false);
  const [predKey, setPredKey] = useState(0);
  const [periodInput, setPeriodInput] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRound = useRef<number>(appState.currentRound);
  const pendingPredicted = useRef<number | null>(null);

  const { rounds, currentRound, totalWinnings, currentStreak, bestStreak } =
    appState;
  const totalRounds = rounds.length;
  const wins = rounds.filter((r) => r.isWin).length;
  const losses = totalRounds - wins;
  const successRate = totalRounds > 0 ? (wins / totalRounds) * 100 : 0;
  const avgAccuracy =
    totalRounds > 0
      ? rounds.reduce((s, r) => s + r.accuracy, 0) / totalRounds
      : 0;

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          pendingRound.current = appState.currentRound;
          pendingPredicted.current = predicted;
          setShowResultModal(true);
          return ROUND_DURATION;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [appState.currentRound, predicted]);

  const handleResultSubmit = useCallback(
    (actual: number) => {
      setShowResultModal(false);
      if (actual < 0) {
        setAppState((prev) => {
          const next = { ...prev, currentRound: prev.currentRound + 1 };
          saveState(next);
          return next;
        });
        setPredicted(null);
        return;
      }

      const pred = pendingPredicted.current;
      const rnd = pendingRound.current;
      if (pred === null) {
        setAppState((prev) => {
          const next = { ...prev, currentRound: prev.currentRound + 1 };
          saveState(next);
          return next;
        });
        return;
      }

      const range = maxVal - minVal;
      const tolerance = Math.max(1, range * 0.05);
      const diff = Math.abs(pred - actual);
      const isWin = diff <= tolerance;
      const accuracy = Math.max(0, 100 - (diff / range) * 100);

      const record: RoundRecord = {
        round: rnd,
        predicted: pred,
        actual,
        accuracy: Math.round(accuracy * 10) / 10,
        isWin,
        winAmount: isWin
          ? `+$${(Math.random() * 30 + 10).toFixed(2)}`
          : undefined,
      };

      setAppState((prev) => {
        const newStreak = isWin ? prev.currentStreak + 1 : 0;
        const newBest = Math.max(prev.bestStreak, newStreak);
        const newWinnings = isWin
          ? prev.totalWinnings +
            Number.parseFloat((record.winAmount || "+$0").slice(1))
          : prev.totalWinnings;
        const next: AppState = {
          rounds: [record, ...prev.rounds].slice(0, 50),
          currentRound: prev.currentRound + 1,
          totalWinnings: Math.round(newWinnings * 100) / 100,
          currentStreak: newStreak,
          bestStreak: newBest,
        };
        saveState(next);
        return next;
      });

      setPredicted(null);

      if (isWin) {
        toast.success(`🎉 Win! Accuracy: ${Math.round(accuracy)}%`);
      } else {
        toast.error(`❌ Loss. Off by ${diff}. Better luck next round!`);
      }
    },
    [maxVal, minVal],
  );

  const handleRoundSave = (n: number) => {
    setAppState((prev) => {
      const next = { ...prev, currentRound: n };
      saveState(next);
      return next;
    });
    toast.success(`Round set to #${n.toLocaleString()}`);
  };

  const handleGenerate = () => {
    const val = generatePrediction(minVal, maxVal, rounds);
    setPredicted(val);
    setPredKey((k) => k + 1);
  };

  const handleGateResult = () => {
    const parsed = Number.parseInt(periodInput, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      handleRoundSave(parsed);
    }
    handleGenerate();
  };

  const handleReset = () => {
    const fresh: AppState = {
      rounds: [],
      currentRound: 1,
      totalWinnings: 0,
      currentStreak: 0,
      bestStreak: 0,
    };
    saveState(fresh);
    setAppState(fresh);
    setPredicted(null);
    toast.success("Stats reset!");
  };

  const timerPct = timeLeft / ROUND_DURATION;
  const timerMins = Math.floor(timeLeft / 60);
  const timerSecs = timeLeft % 60;
  const timerStr = `${String(timerMins).padStart(2, "0")}:${String(timerSecs).padStart(2, "0")}`;
  const recentRounds = rounds.slice(0, 8);

  const topPredictors = [
    { name: "CryptoOracle", label: "Top Predictor", acc: 94.2, initials: "CO" },
    { name: "NovaSeer", label: "Rising Star", acc: 91.7, initials: "NS" },
    { name: "QuantumPick", label: "Veteran", acc: 89.5, initials: "QP" },
    { name: "DataDriven", label: "Consistent", acc: 88.1, initials: "DD" },
  ];

  const communityFeed = [
    {
      name: "AlphaTrader",
      msg: "Just hit a 15-round win streak!",
      time: "7m ago",
      initials: "AT",
    },
    {
      name: "StarlightPro",
      msg: "Predicted #847 exactly. Unreal.",
      time: "9h ago",
      initials: "SP",
    },
    {
      name: "NebulaPick",
      msg: "$120 won in last 5 rounds 🔥",
      time: "12h ago",
      initials: "NP",
    },
    {
      name: "GridMaster",
      msg: "Algorithm is insane today",
      time: "1d ago",
      initials: "GM",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster position="top-right" />
      <NavBar activeTab={activeTab} onTab={setActiveTab} />

      <ResultModal
        open={showResultModal}
        round={pendingRound.current}
        predicted={pendingPredicted.current}
        minVal={minVal}
        maxVal={maxVal}
        onSubmit={handleResultSubmit}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        {/* Hero: Timer */}
        <motion.section
          className="text-center space-y-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-semibold tracking-[0.15em] uppercase text-muted-foreground">
            Next Round Starts In
          </p>
          <div className="flex items-center justify-center gap-4">
            <div className="relative w-16 h-16">
              <TimerRing pct={timerPct} />
            </div>
            <div className="flex items-end gap-1">
              <span
                className="timer-text"
                style={{ color: timeLeft <= 10 ? "#EF4444" : "#EAF0FF" }}
              >
                {timerStr}
              </span>
              <span className="text-muted-foreground text-sm mb-3 font-mono">
                <span className="text-xs text-muted-foreground/60">ms</span>
              </span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>
              Round #{currentRound.toLocaleString()} • {ROUND_DURATION}s
              intervals
            </span>
          </div>
        </motion.section>

        {/* 3-column card row */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Min/Max Settings */}
          <motion.div
            className="card-gradient rounded-2xl border border-border/50 p-5 shadow-card flex flex-col gap-4"
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Range Settings
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="min-input"
                  className="text-xs text-muted-foreground mb-1.5 block"
                >
                  Minimum
                </label>
                <input
                  id="min-input"
                  data-ocid="settings.min.input"
                  type="number"
                  value={minVal}
                  onChange={(e) =>
                    setMinVal(Math.max(0, Number.parseInt(e.target.value) || 0))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 font-mono"
                />
              </div>
              <div>
                <label
                  htmlFor="max-input"
                  className="text-xs text-muted-foreground mb-1.5 block"
                >
                  Maximum
                </label>
                <input
                  id="max-input"
                  data-ocid="settings.max.input"
                  type="number"
                  value={maxVal}
                  onChange={(e) =>
                    setMaxVal(
                      Math.max(
                        minVal + 1,
                        Number.parseInt(e.target.value) || 100,
                      ),
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 font-mono"
                />
              </div>
            </div>
            <div className="mt-auto pt-2 border-t border-border/30">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Range</span>
                <span className="font-mono text-foreground">
                  {(maxVal - minVal).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-muted-foreground">Tolerance (±5%)</span>
                <span className="font-mono text-foreground">
                  ±{Math.max(1, Math.round((maxVal - minVal) * 0.05))}
                </span>
              </div>
            </div>
          </motion.div>

          {/* CTA Prediction Card */}
          <motion.div
            className="card-gradient rounded-2xl border border-border/50 p-5 shadow-card flex flex-col items-center gap-4"
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="text-center">
              <p className="text-xs font-semibold tracking-[0.12em] uppercase text-muted-foreground">
                Your Prediction For
              </p>
              <p className="text-sm font-bold text-foreground">
                Round #{currentRound.toLocaleString()}
              </p>
            </div>

            {/* Predicted number display */}
            <div
              className="relative w-full rounded-xl overflow-hidden"
              style={{ minHeight: 120 }}
            >
              <div className="cta-gradient absolute inset-0" />
              <div className="relative z-10 flex flex-col items-center justify-center h-full py-5 px-4 gap-2">
                <span className="text-xs font-bold tracking-[0.2em] uppercase text-white/80">
                  One-Tap Prediction
                </span>
                <AnimatePresence mode="wait">
                  {predicted !== null ? (
                    <motion.span
                      key={predKey}
                      className="text-5xl font-black text-white font-mono"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.2, opacity: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 20,
                      }}
                    >
                      {predicted}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="idle"
                      className="text-2xl font-black text-white/50 tracking-wider"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      - - -
                    </motion.span>
                  )}
                </AnimatePresence>
                <span className="text-xs text-white/60">
                  {predicted !== null
                    ? "Enter period & tap Gate Result"
                    : "Enter period number below"}
                </span>
              </div>
              <div className="absolute inset-0 rounded-xl ring-2 ring-white/10" />
            </div>

            {/* Period Number Input */}
            <div className="w-full space-y-2">
              <label
                htmlFor="period-input"
                className="text-xs text-muted-foreground block"
              >
                Period Number
              </label>
              <input
                id="period-input"
                data-ocid="prediction.input"
                type="number"
                min={1}
                value={periodInput}
                onChange={(e) => setPeriodInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGateResult()}
                placeholder="Enter period number…"
                className="w-full px-3 py-2 rounded-lg border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 font-mono"
              />
            </div>

            {/* Gate Result Button */}
            <button
              type="button"
              data-ocid="prediction.primary_button"
              onClick={handleGateResult}
              className="relative w-full rounded-xl overflow-hidden group py-3"
            >
              <div className="cta-gradient absolute inset-0 transition-opacity group-hover:opacity-90" />
              <div className="relative z-10 flex items-center justify-center gap-2">
                <Zap className="w-4 h-4 text-white" />
                <span className="text-sm font-black text-white tracking-[0.12em] uppercase">
                  Gate Result
                </span>
              </div>
              <div className="absolute inset-0 rounded-xl ring-2 ring-white/10 group-hover:ring-white/25 transition-all" />
            </button>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="w-3 h-3 text-warning" />
              <span>High Accuracy Algorithm Active</span>
            </div>
          </motion.div>

          {/* Live Round Stats */}
          <motion.div
            className="card-gradient rounded-2xl border border-border/50 p-5 shadow-card"
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Live Round Stats
              </h2>
            </div>
            <div className="space-y-3">
              {[
                { label: "Total Rounds", value: totalRounds.toLocaleString() },
                { label: "Win Rate", value: `${successRate.toFixed(1)}%` },
                { label: "Avg Accuracy", value: `${avgAccuracy.toFixed(1)}%` },
                {
                  label: "Total Winnings",
                  value: `$${totalWinnings.toFixed(2)}`,
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-sm font-bold text-foreground font-mono">
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border/30">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Current Round
                </span>
                <RoundEditor
                  currentRound={currentRound}
                  onSave={handleRoundSave}
                />
              </div>
            </div>
          </motion.div>
        </section>

        {/* Activity & Stats */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Win/Loss Tracker */}
          <motion.div
            className="lg:col-span-2 card-gradient rounded-2xl border border-border/50 shadow-card overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="p-5 border-b border-border/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-warning" />
                  <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                    Win / Loss Tracker
                  </h2>
                </div>
                <button
                  type="button"
                  data-ocid="tracker.reset.button"
                  onClick={handleReset}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Reset
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-0 divide-x divide-border/30">
              <div className="p-5 flex items-center gap-4">
                <DonutChart pct={successRate} />
                <div className="space-y-1.5">
                  <div className="text-2xl font-black text-success">{wins}</div>
                  <div className="text-xs text-muted-foreground">Wins</div>
                  <div className="text-2xl font-black text-destructive">
                    {losses}
                  </div>
                  <div className="text-xs text-muted-foreground">Losses</div>
                </div>
              </div>
              <div className="p-5 flex flex-col justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-warning" />
                  <span className="text-3xl font-black text-warning">
                    {currentStreak}
                  </span>
                  <span className="text-sm text-muted-foreground font-medium">
                    Win Streak
                  </span>
                </div>
                <div className="space-y-2 mt-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Best Streak</span>
                    <span className="font-bold text-foreground">
                      {bestStreak}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      Total Winnings
                    </span>
                    <span className="font-bold text-success">
                      ${totalWinnings.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Avg Accuracy</span>
                    <span className="font-bold text-foreground">
                      {avgAccuracy.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border/30">
              <div className="px-5 py-3 flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  Recent Rounds
                </span>
              </div>
              {recentRounds.length === 0 ? (
                <div
                  data-ocid="tracker.empty_state"
                  className="px-5 pb-5 text-center text-sm text-muted-foreground py-8"
                >
                  No rounds yet. Generate a prediction and submit results!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/30">
                        {[
                          "#",
                          "Prediction",
                          "Result",
                          "Accuracy",
                          "Outcome",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-2 text-left text-muted-foreground font-medium"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recentRounds.map((r, i) => (
                        <motion.tr
                          key={r.round}
                          data-ocid={`tracker.item.${i + 1}`}
                          className="border-b border-border/20 hover:bg-white/[0.02] transition-colors"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                        >
                          <td className="px-4 py-2.5 font-mono text-muted-foreground">
                            #{r.round}
                          </td>
                          <td className="px-4 py-2.5 font-mono font-semibold text-foreground">
                            {r.predicted}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-foreground">
                            {r.actual}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`font-mono font-semibold ${r.accuracy >= 90 ? "text-success" : r.accuracy >= 70 ? "text-warning" : "text-destructive"}`}
                            >
                              {r.accuracy}%
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                r.isWin
                                  ? "bg-success/10 text-success"
                                  : "bg-destructive/10 text-destructive"
                              }`}
                            >
                              {r.isWin ? r.winAmount || "Win" : "Loss"}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>

          {/* Sidebar */}
          <div className="space-y-4">
            <motion.div
              className="card-gradient rounded-2xl border border-border/50 p-5 shadow-card"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  Top Predictors
                </h2>
                <span className="ml-auto text-xs text-muted-foreground">
                  This Week
                </span>
              </div>
              <div className="space-y-3">
                {topPredictors.map((p, i) => (
                  <div
                    key={p.name}
                    data-ocid={`leaderboard.item.${i + 1}`}
                    className="flex items-center gap-3"
                  >
                    <div className="w-7 h-7 rounded-full cta-gradient flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {p.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{p.label}</p>
                    </div>
                    <span className="text-sm font-bold text-success shrink-0">
                      {p.acc}%
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="card-gradient rounded-2xl border border-border/50 p-5 shadow-card"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-4 h-4 text-warning" />
                <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  Community Wins
                </h2>
              </div>
              <div className="space-y-3">
                {communityFeed.map((f, i) => (
                  <div
                    key={f.name}
                    data-ocid={`community.item.${i + 1}`}
                    className="flex items-start gap-3"
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: `hsl(${i * 60 + 180} 60% 45%)` }}
                    >
                      {f.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">
                        {f.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {f.msg}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground/60 shrink-0 whitespace-nowrap">
                      {f.time}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <footer
        className="border-t border-border/30 mt-8"
        style={{ backgroundColor: "oklch(0.13 0.025 243)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded cta-gradient flex items-center justify-center">
                  <Zap className="w-3 h-3 text-white" />
                </div>
                <span className="font-bold text-foreground">PredictFlow</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Advanced number prediction with real-time analytics and smart
                algorithms.
              </p>
            </div>
            {(
              [
                { title: "Company", links: ["About", "Careers", "Blog"] },
                {
                  title: "Support",
                  links: ["Help Center", "Contact", "Status"],
                },
                { title: "Legal", links: ["Privacy", "Terms", "Cookies"] },
              ] as const
            ).map(({ title, links }) => (
              <div key={title}>
                <h4 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
                  {title}
                </h4>
                <ul className="space-y-2">
                  {links.map((l) => (
                    <li key={l}>
                      <a
                        href="/"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group"
                      >
                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-border/30 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} PredictFlow. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Built with ❤️ using{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                className="hover:text-foreground transition-colors underline underline-offset-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
