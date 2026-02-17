// === Config ===
const TOTAL_SECONDS = 30 * 60; // 30 minutes

// correct answers (q1..q10)
const ANSWERS = {
  q1: "B",
  q2: "C",
  q3: "A",
  q4: "A",
  q5: "A",
  q6: "T",
  q7: "F",
  q8: "F",
  q9: "T",
  q10: "NG",
};

const THEME_KEY = "ielts-theme";
const RESULT_KEY = "ielts-last-result";
const RESULT_PAGE = "results.html";

let secondsLeft = TOTAL_SECONDS;
let timerId = null;
let started = false;
let submitted = false;

// === Elements ===
const timerEl = document.getElementById("timer");
const startBtn = document.getElementById("startBtn");
const checkBtnTop = document.getElementById("checkBtn");
const checkBtnBottom = document.getElementById("checkBtnBottom");
const resetBtn = document.getElementById("resetBtn");
const statusEl = document.getElementById("status");
const formEl = document.getElementById("testForm");
const scoreBox = document.getElementById("scoreBox");
const scoreEl = document.getElementById("score");
const themeToggleBtn = document.getElementById("themeToggle");

// === Helpers ===
function pad(n) {
  return String(n).padStart(2, "0");
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
    // Ignore write failures (private mode, blocked storage, etc).
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

function renderTime() {
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  timerEl.textContent = `${pad(m)}:${pad(s)}`;

  timerEl.classList.remove("warn", "danger");
  if (secondsLeft <= 60 && secondsLeft > 20) timerEl.classList.add("warn");
  if (secondsLeft <= 20) timerEl.classList.add("danger");
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

function enableCheckButtons(on) {
  checkBtnTop.disabled = !on;
  checkBtnBottom.disabled = !on;
}

function getUserAnswer(name) {
  const checked = formEl.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : null;
}

function lockForm(lock) {
  const inputs = formEl.querySelectorAll("input");
  inputs.forEach((i) => (i.disabled = lock));
}

function markQuestion(qNum, ok, correctVal) {
  const qEl = formEl.querySelector(`.q[data-q="${qNum}"]`);
  const fb = document.getElementById(`fb${qNum}`);

  qEl.classList.remove("correct", "wrong");
  if (ok) {
    qEl.classList.add("correct");
    fb.textContent = "Correct";
  } else {
    qEl.classList.add("wrong");
    fb.textContent = `Wrong. Correct answer: ${correctVal}`;
  }
}

function clearMarks() {
  for (let i = 1; i <= 10; i++) {
    const qEl = formEl.querySelector(`.q[data-q="${i}"]`);
    const fb = document.getElementById(`fb${i}`);
    qEl.classList.remove("correct", "wrong");
    fb.textContent = "";
  }
  scoreBox.classList.add("hidden");
  scoreEl.textContent = "0/10";
}

function saveResultAndRedirect(score, autoSubmitted) {
  const total = Object.keys(ANSWERS).length;
  const percent = Math.round((score / total) * 100);
  const secondsSpent = TOTAL_SECONDS - secondsLeft;

  const result = {
    score,
    total,
    wrong: total - score,
    percent,
    secondsSpent,
    autoSubmitted,
    finishedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(RESULT_KEY, JSON.stringify(result));
  } catch {
    // Ignore write failures and still try redirect with URL params.
  }

  const params = new URLSearchParams({
    score: String(result.score),
    total: String(result.total),
    wrong: String(result.wrong),
    percent: String(result.percent),
    secondsSpent: String(result.secondsSpent),
    auto: String(result.autoSubmitted),
    finishedAt: result.finishedAt,
  });

  window.location.href = `${RESULT_PAGE}?${params.toString()}`;
}

// === Timer ===
function startTimer() {
  if (started) return;

  started = true;
  submitted = false;
  setStatus("Test started. Focus. No distractions.");
  enableCheckButtons(true);
  startBtn.disabled = true;

  timerId = setInterval(() => {
    secondsLeft -= 1;
    renderTime();

    if (secondsLeft <= 0) {
      secondsLeft = 0;
      renderTime();
      clearInterval(timerId);
      timerId = null;
      setStatus("Time is up. Auto-checking answers.");
      checkAnswers(true); // auto submit
    }
  }, 1000);
}

function resetAll() {
  if (timerId) clearInterval(timerId);
  timerId = null;

  secondsLeft = TOTAL_SECONDS;
  started = false;
  submitted = false;

  startBtn.disabled = false;
  enableCheckButtons(false);
  lockForm(false);

  formEl.reset();
  clearMarks();
  setStatus("Not started.");
  renderTime();
}

// === Grading ===
function checkAnswers(auto = false) {
  if (!started && !auto) return;

  if (submitted) {
    setStatus("Already checked. Reset to try again.");
    return;
  }

  let score = 0;

  for (let i = 1; i <= 10; i++) {
    const key = `q${i}`;
    const user = getUserAnswer(key);
    const correct = ANSWERS[key];

    const ok = user === correct;
    if (ok) score += 1;

    markQuestion(i, ok, correct);
  }

  submitted = true;
  scoreBox.classList.remove("hidden");
  scoreEl.textContent = `${score}/10`;

  // lock after submission
  lockForm(true);

  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }

  const msg =
    score >= 8
      ? "Strong. Moving to results page."
      : score >= 5
      ? "Decent. Moving to results page."
      : "Needs work. Moving to results page.";

  setStatus(`Checked. ${msg}`);
  saveResultAndRedirect(score, auto);
}

// === Events ===
startBtn.addEventListener("click", startTimer);
checkBtnTop.addEventListener("click", () => checkAnswers(false));
checkBtnBottom.addEventListener("click", () => checkAnswers(false));
resetBtn.addEventListener("click", resetAll);
if (themeToggleBtn) themeToggleBtn.addEventListener("click", toggleTheme);

// Initial render
initTheme();
renderTime();
