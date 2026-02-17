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

// === Helpers ===
function pad(n) {
  return String(n).padStart(2, "0");
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
    fb.textContent = `✅ Correct`;
  } else {
    qEl.classList.add("wrong");
    fb.textContent = `❌ Wrong. Correct answer: ${correctVal}`;
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
      ? "Strong. Now push it to full IELTS level with longer passages."
      : score >= 5
      ? "Decent, but you're leaking points. Fix weak question types."
      : "This is not test-ready. Drill daily until you stop guessing.";

  setStatus(`Checked. ${msg}`);
}

// === Events ===
startBtn.addEventListener("click", startTimer);
checkBtnTop.addEventListener("click", () => checkAnswers(false));
checkBtnBottom.addEventListener("click", () => checkAnswers(false));
resetBtn.addEventListener("click", resetAll);

// Initial render
renderTime();
