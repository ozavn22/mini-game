let puzzles = [];
let state = null;
let selectedOp = null;

const el = {
  target: document.getElementById("target"),
  current: document.getElementById("current"),
  movesLeft: document.getElementById("movesLeft"),
  ops: document.getElementById("ops"),
  numbers: document.getElementById("numbers"),
  history: document.getElementById("history"),
  ruleText: document.getElementById("ruleText"),
  resultBox: document.getElementById("resultBox"),
  resultTitle: document.getElementById("resultTitle"),
  resultDesc: document.getElementById("resultDesc"),
  undoBtn: document.getElementById("undoBtn"),
  resetBtn: document.getElementById("resetBtn"),
  newGameBtn: document.getElementById("newGameBtn")
};

function pickRandomPuzzle() {
  return puzzles[Math.floor(Math.random() * puzzles.length)];
}

function initGame(puzzle) {
  state = {
    puzzle,
    current: puzzle.start,
    movesLeft: puzzle.maxMoves,
    usedIndexes: new Set(),
    history: [],
    opHistory: [],
    usedNumbers: []
  };
  selectedOp = null;
  render();
}

function getRuleText(p) {
  const parts = [];
  if (p.rules.noRepeatOp) parts.push("Aynı işlem art arda kullanılamaz");
  if (p.rules.consumeNumbers) parts.push("Sayı kartı bir kez kullanılır");
  if (p.rules.mustUse?.length) parts.push(`Zorunlu sayı(lar): ${p.rules.mustUse.join(", ")}`);
  return parts.length ? parts.join(" • ") : "Özel kural yok";
}

function render() {
  const p = state.puzzle;
  el.target.textContent = p.target;
  el.current.textContent = state.current;
  el.movesLeft.textContent = state.movesLeft;
  el.ruleText.textContent = getRuleText(p);

  renderOps();
  renderNumbers();
  renderHistory();
  hideResult();
}

function renderOps() {
  el.ops.innerHTML = "";
  state.puzzle.ops.forEach((op) => {
    const b = document.createElement("button");
    b.className = "op-btn" + (selectedOp === op ? " selected" : "");
    b.textContent = op;
    b.onclick = () => {
      selectedOp = op;
      renderOps();
    };
    el.ops.appendChild(b);
  });
}

function renderNumbers() {
  el.numbers.innerHTML = "";
  state.puzzle.numbers.forEach((n, idx) => {
    const used = state.usedIndexes.has(idx);
    const b = document.createElement("button");
    b.className = "num-btn" + (used ? " used" : "");
    b.textContent = n;
    b.disabled = used;
    b.onclick = () => onNumberClick(n, idx);
    el.numbers.appendChild(b);
  });
}

function renderHistory() {
  el.history.innerHTML = "";
  if (!state.history.length) {
    const li = document.createElement("li");
    li.textContent = "Henüz hamle yok";
    el.history.appendChild(li);
    return;
  }
  state.history.forEach((h) => {
    const li = document.createElement("li");
    li.textContent = h;
    el.history.appendChild(li);
  });
}

function applyOp(current, op, n) {
  if (op === "+") return current + n;
  if (op === "-") return current - n;
  if (op === "*") return current * n;
  if (op === "/") {
    if (n === 0) return null;
    if (current % n !== 0) return null; // sadece tam bölme
    return current / n;
  }
  return null;
}

function onNumberClick(n, idx) {
  if (!selectedOp) {
    alert("Önce işlem seç.");
    return;
  }
  if (state.movesLeft <= 0) return;

  const p = state.puzzle;
  const lastOp = state.opHistory[state.opHistory.length - 1];
  if (p.rules.noRepeatOp && lastOp === selectedOp) {
    alert("Bu bölümde aynı işlem art arda kullanılamaz.");
    return;
  }

  const next = applyOp(state.current, selectedOp, n);
  if (next === null) {
    alert("Geçersiz işlem (örn. tam bölünmeyen bölme).");
    return;
  }

  const prev = state.current;
  state.current = next;
  state.movesLeft -= 1;
  state.opHistory.push(selectedOp);
  state.usedNumbers.push(n);

  if (p.rules.consumeNumbers) state.usedIndexes.add(idx);

  state.history.push(`${prev} ${selectedOp} ${n} = ${next}`);
  selectedOp = null;

  renderOps();
  renderNumbers();
  renderHistory();
  el.current.textContent = state.current;
  el.movesLeft.textContent = state.movesLeft;

  checkEnd();
}

function checkEnd() {
  const p = state.puzzle;

  if (state.current === p.target) {
    if (p.rules.mustUse?.length) {
      const mustSet = new Set(p.rules.mustUse);
      const usedSet = new Set(state.usedNumbers);
      for (const m of mustSet) {
        if (!usedSet.has(m)) {
          showResult(false, "Hedefi buldun ama zorunlu sayı kuralı sağlanmadı.");
          return;
        }
      }
    }
    showResult(true, "Tebrikler! Bölümü çözdün 🎉");
    return;
  }

  if (state.movesLeft === 0) {
    showResult(false, "Hamle bitti. Tekrar dene 💪");
  }
}

function showResult(win, desc) {
  el.resultBox.classList.add("show");
  el.resultBox.classList.toggle("win", win);
  el.resultBox.classList.toggle("lose", !win);
  el.resultTitle.textContent = win ? "Kazandın" : "Kaybettin";
  el.resultDesc.textContent = desc;
}

function hideResult() {
  el.resultBox.classList.remove("show", "win", "lose");
}

function undo() {
  // Basit MVP: geri al için reset + geçmişi yeniden oynatma
  if (!state.history.length) return;
  const snapshot = [...state.history];
  const puzzle = state.puzzle;
  initGame(puzzle);

  snapshot.pop(); // son hamleyi çıkar
  // Bu basit MVP’de Undo yerine reset önerilir; tam replay parser yazmıyoruz.
  // Daha iyi undo için hamle stack objesi tutulmalı.
  alert("MVP sürümünde geri al basit tutuldu. Son hamle için Sıfırla + tekrar oyna önerilir.");
}

function resetGame() {
  initGame(state.puzzle);
}

async function load() {
  const res = await fetch("./puzzles.json");
  puzzles = await res.json();
  initGame(pickRandomPuzzle());
}

el.newGameBtn.onclick = () => initGame(pickRandomPuzzle());
el.resetBtn.onclick = resetGame;
el.undoBtn.onclick = undo;

load().catch((e) => {
  console.error(e);
  alert("Puzzle dosyası yüklenemedi.");
});