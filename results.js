const THEME_KEY = "ielts-theme";
const RESULT_KEY = "ielts-last-result";

const themeToggleBtn = document.getElementById("themeToggle");
const scoreRing = document.getElementById("scoreRing");
const scoreValue = document.getElementById("scoreValue");
const percentValue = document.getElementById("percentValue");
const headline = document.getElementById("headline");
const resultMessage = document.getElementById("resultMessage");
const correctValue = document.getElementById("correctValue");
const wrongValue = document.getElementById("wrongValue");
const submissionType = document.getElementById("submissionType");
const timeSpent = document.getElementById("timeSpent");
const finishedAt = document.getElementById("finishedAt");
const scoreRate = document.getElementById("scoreRate");
const nextStep = document.getElementById("nextStep");

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatDuration(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds) || 0);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${pad(m)}:${pad(s)}`;
}

function formatFinishedAt(iso) {
  if (!iso) return "-";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString();
}

function getStoredTheme() {
  try {
    return window.localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

function storeTheme(theme) {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore write failures.
  }
}

function applyTheme(theme) {
  const isLight = theme === "light";
  document.body.classList.toggle("light", isLight);

  if (!themeToggleBtn) return;
  themeToggleBtn.setAttribute(
    "aria-label",
    isLight ? "Switch to dark mode" : "Switch to light mode"
  );
  themeToggleBtn.setAttribute("aria-pressed", String(isLight));
}

function initTheme() {
  const savedTheme = getStoredTheme();
  if (savedTheme === "light" || savedTheme === "dark") {
    applyTheme(savedTheme);
    return;
  }

  const prefersLight =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: light)").matches;

  applyTheme(prefersLight ? "light" : "dark");
}

function toggleTheme() {
  const nextTheme = document.body.classList.contains("light") ? "dark" : "light";
  applyTheme(nextTheme);
  storeTheme(nextTheme);
}

function readResultFromQuery() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("score")) return null;

  return {
    score: Number(params.get("score")),
    total: Number(params.get("total")),
    wrong: Number(params.get("wrong")),
    percent: Number(params.get("percent")),
    secondsSpent: Number(params.get("secondsSpent")),
    autoSubmitted: params.get("auto") === "true",
    finishedAt: params.get("finishedAt") || "",
  };
}

function readResultFromStorage() {
  try {
    const raw = window.localStorage.getItem(RESULT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeResult(raw) {
  if (!raw || typeof raw !== "object") return null;

  const totalCandidate = Number(raw.total);
  const total = Number.isFinite(totalCandidate) && totalCandidate > 0 ? totalCandidate : 10;

  const scoreCandidate = Number(raw.score);
  const score = Number.isFinite(scoreCandidate) ? clamp(Math.round(scoreCandidate), 0, total) : 0;

  const wrong = total - score;

  const secondsCandidate = Number(raw.secondsSpent);
  const secondsSpent = Number.isFinite(secondsCandidate) ? Math.max(0, Math.round(secondsCandidate)) : 0;

  const percentCandidate = Number(raw.percent);
  const percent = Number.isFinite(percentCandidate)
    ? clamp(Math.round(percentCandidate), 0, 100)
    : Math.round((score / total) * 100);

  return {
    score,
    total,
    wrong,
    percent,
    secondsSpent,
    autoSubmitted: Boolean(raw.autoSubmitted),
    finishedAt: typeof raw.finishedAt === "string" ? raw.finishedAt : "",
  };
}

function getPerformanceMeta(percent) {
  if (percent >= 80) {
    return {
      tone: "high",
      headline: "Excellent IELTS reading pace",
      message:
        "Your accuracy is strong. Keep pressure by practicing harder passages and tighter timing.",
      nextStep: "Try longer texts and focus on tricky inference questions to stay above 80%.",
    };
  }

  if (percent >= 55) {
    return {
      tone: "mid",
      headline: "Solid base, needs sharper control",
      message:
        "You are close. Improve scanning speed and avoid changing answers without evidence.",
      nextStep: "Do one timed set daily and review every wrong answer by question type.",
    };
  }

  return {
    tone: "low",
    headline: "Rebuild from fundamentals",
    message:
      "Accuracy is currently too low for exam day. Strengthen vocabulary and question strategy first.",
    nextStep: "Train untimed first, then move back to 30-minute tests once accuracy improves.",
  };
}

function renderResult(result) {
  scoreRing.style.setProperty("--percent", String(result.percent));

  const meta = getPerformanceMeta(result.percent);
  scoreRing.dataset.tone = meta.tone;

  scoreValue.textContent = `${result.score}/${result.total}`;
  percentValue.textContent = `${result.percent}%`;
  headline.textContent = meta.headline;
  resultMessage.textContent = meta.message;
  nextStep.textContent = meta.nextStep;

  correctValue.textContent = String(result.score);
  wrongValue.textContent = String(result.wrong);
  submissionType.textContent = result.autoSubmitted ? "Auto" : "Manual";
  timeSpent.textContent = formatDuration(result.secondsSpent);
  finishedAt.textContent = formatFinishedAt(result.finishedAt);
  scoreRate.textContent = `${result.percent}%`;

  document.title = `IELTS Result ${result.score}/${result.total}`;
}

function initResultPage() {
  const fromQuery = normalizeResult(readResultFromQuery());
  const fromStorage = normalizeResult(readResultFromStorage());
  const result = fromQuery || fromStorage;

  if (!result) return;
  renderResult(result);
}

if (themeToggleBtn) themeToggleBtn.addEventListener("click", toggleTheme);
initTheme();
initResultPage();
