type OperationType = '+' | '-' | '*';

interface Problem{
  id: string;
  num1: number;
  num2: number;
  opType: OperationType;
  answer: number;
  userInput?: string;
}

const gridEl = document.getElementById('grid') as HTMLDivElement;
const opSelect = document.getElementById('opSelect') as HTMLSelectElement;
const regenBtn = document.getElementById('regenBtn') as HTMLButtonElement;
const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const checkBtn = document.getElementById('checkBtn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;
const timerEl = document.getElementById('timer') as HTMLDivElement;
const maxValueSelect = document.getElementById('maxValue') as HTMLSelectElement;

let problems: Problem[] = [];
let timerInterval: number | null = null;
let startTime: number | null = null;

function getRandInt(min: number, max: number){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function genProblems(opType: OperationType, maxVal: number){
  let answer: number;

  const min = 1;
  problems = [];
  for (let i = 0; i < 10; i++) {
    let num1 = getRandInt(min, maxVal);
    
    for (let j = 0; j < 10; j++) {
      let num2: number;
      if (opType === '+') {
        num2 = getRandInt(min, maxVal);
        answer = num1 + num2;
      } else if (opType === '-') {
        num2 = getRandInt(min, num1); // 結果を非負にする
        answer = num1 - num2;
      } else if (opType === '*') {
        num2 = getRandInt(min, Math.min(12, maxVal));
        answer = num1 * num2;
      } else {
        throw new Error(`Invalid operation type: ${opType}`);
      }

      problems.push({ num1: num1, num2: num2, opType: opType, answer, id: cryptoId() });
    }
  }
}

function cryptoId(){
  return Math.random().toString(36).slice(2, 9);
}

function generateProblems() {
  const op = opSelect.value as OperationType;
  const maxVal = Number(maxValueSelect.value);
  genProblems(op, maxVal);
  
  renderGrid();
  updateStatus();
  resetTimer();
}

function renderGrid() {
  gridEl.innerHTML = '';
  for (const p of problems) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset["id"] = p.id;

    const q = document.createElement('div');
    q.className = 'question';
    q.textContent = `${p.num1} ${p.opType} ${p.num2} =`;

    const input = document.createElement('input');
    input.type = 'text';
    input.setAttribute('inputmode', 'numeric');
    input.value = p.userInput ?? '';
    input.addEventListener('input', () => {
      const userRaw = input.value.trim();
      p.userInput = userRaw;
      
      // Auto-check answer
      const parsed = userRaw === '' ? null : Number(userRaw);
      const isCorrect = parsed !== null && !Number.isNaN(parsed) && parsed === p.answer;
      
      if (isCorrect) {
        cell.classList.remove('wrong');
        cell.classList.add('correct');
        // Move to next cell
        setTimeout(() => {
          focusNextInput(p.id);
        }, 100);
      } else {
        cell.classList.remove('correct');
        if (userRaw !== '') {
          cell.classList.add('wrong');
        } else {
          cell.classList.remove('wrong');
        }
      }
      
      updateStatus();
    });

    // Enterで次のセルにフォーカスする
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        focusNextInput(p.id);
      }
    });

    cell.appendChild(q);
    cell.appendChild(input);
    gridEl.appendChild(cell);
  }
}

function focusNextInput(currentId: string) {
  const idx = problems.findIndex(p => p.id === currentId);
  if (idx >= 0 && idx < problems.length - 1) {
    const nextId = problems![idx + 1]!.id;
    const nextInput = gridEl.querySelector(`div.cell[data-id="${nextId}"] input`) as HTMLInputElement | null;
    nextInput?.focus();
  }
}

function checkAnswers() {
  let correct = 0;
  problems.forEach((p) => {
    const cell = gridEl.querySelector(`div.cell[data-id="${p.id}"]`) as HTMLDivElement | null;
    if (!cell) return;
    const input = cell.querySelector('input') as HTMLInputElement;
    const userRaw = (input.value ?? '').trim();
    p.userInput = userRaw;
    // 空欄は不正解扱い
    const parsed = userRaw === '' ? null : Number(userRaw);
    if (parsed !== null && !Number.isNaN(parsed) && parsed === p.answer) {
      correct++;
      cell.classList.remove('wrong');
      cell.classList.add('correct');
    } else {
      cell.classList.remove('correct');
      cell.classList.add('wrong');
    }
  });
  updateStatus(correct);
  stopTimer();
}

function updateStatus(correctCount?: number) {
  const c = typeof correctCount === 'number' ? correctCount : problems.reduce((acc, p) => {
    // 仮の既答チェック（正確な採点は checkAnswers を呼ぶ）
    const parsed = p.userInput ? Number(p.userInput) : null;
    return acc + ((parsed !== null && !Number.isNaN(parsed) && parsed === p.answer) ? 1 : 0);
  }, 0);
  statusEl.textContent = `正答: ${c} / ${problems.length}`;
}

function startTimer() {
  if (timerInterval)
     return; // 既に動いている
     
  startTime = Date.now();
  timerInterval = window.setInterval(() => {
    if (!startTime) return;
    const elapsedMs = Date.now() - startTime;
    timerEl.textContent = formatTime(elapsedMs);
  }, 100);
}

function resetTimer() {
  stopTimer();
  timerEl.textContent = '00:00:000';
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  startTime = null;
}

function formatTime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const mm = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const ss = (totalSec % 60).toString().padStart(2, '0');
  const mmm = (ms % 1000).toString().padStart(3, '0');
  return `${mm}:${ss}:${mmm}`;
}

// 小さなヘルパー: 全入力欄にフォーカスする最初のもの
function focusFirst() {
  const firstInput = gridEl.querySelector('input') as HTMLInputElement | null;
  firstInput?.focus();
}

// イベント登録
regenBtn.addEventListener('click', () => {
  generateProblems();
  focusFirst();
});
opSelect.addEventListener('change', () => generateProblems());
maxValueSelect.addEventListener('change', () => generateProblems());

startBtn.addEventListener('click', () => {
  if (!timerInterval) {
    startTimer();
    startBtn.textContent = '停止';
  } else {
    stopTimer();
    startBtn.textContent = '開始';
  }
});

checkBtn.addEventListener('click', () => {
  checkAnswers();
});

// 初期化
generateProblems();
