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
const statusEl = document.getElementById('status') as HTMLDivElement;
const timerEl = document.getElementById('timer') as HTMLDivElement;
const maxValueSelect = document.getElementById('maxValue') as HTMLSelectElement;

let problems: Problem[] = [];
let timerInterval: number | null = null;
let startTime: number | null = null;

function getRandInt(min: number, max: number): number {
  const minCeil = Math.ceil(min);
  const maxFloor = Math.floor(max);
  return Math.floor(Math.random() * (maxFloor - minCeil + 1)) + minCeil;
}

function shuffleArray(min: number, max: number, size: number): number[] {
  let results: number[] = [];
  results[0] = getRandInt(min, max);

  for (let i = 1; i < size; i++)
  {
    let num = getRandInt(min, max);
    while (results[i-1] === num
        || results.filter(n => n === num).length >= 2)
    {
      num = getRandInt(min, max);
    }
    results.push(num);
  }

  return results;
}

function genProblems(opType: OperationType, max: number){
  let answer: number;

  const min = 1;  
  const num1Values = shuffleArray(min, max, 10);
  
  const num2Max = opType === '*' ? Math.min(2, max) : max;
  const num2Values = shuffleArray(min, num2Max, 10);
  
  // Generate problems
  problems = [];
  for (let i = 0; i < 10; i++) {
    const num1 = num1Values[i]!;
    
    for (let j = 0; j < 10; j++) {
      const num2 = num2Values[j]!;
      
      if (opType === '+') {
        answer = num1 + num2;
      } else if (opType === '-') {
        // For subtraction, ensure num1 >= num2
        if (num1 < num2) {
          answer = num2 - num1;
          problems.push({ num1: num2, num2: num1, opType: opType, answer, id: cryptoId() });
          continue;
        }
        answer = num1 - num2;
      } else if (opType === '*') {
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
  
  // Extract unique num1 and num2 values for headers
  const num1Values: number[] = [];
  const num2Values: number[] = [];
  
  const problemsNum = 10;
  for (let i = 0; i < problemsNum; i++) {
    const rowProblem = problems[i * problemsNum];
    if (rowProblem) {
      num1Values.push(rowProblem.num1);
    }
  }
  
  for (let j = 0; j < problemsNum; j++) {
    const colProblem = problems[j];
    if (colProblem) {
      num2Values.push(colProblem.num2);
    }
  }
  
  // Top-left empty cell
  const emptyCell = document.createElement('div');
  emptyCell.className = 'cell header-cell';
  gridEl.appendChild(emptyCell);
  
  // Header row (num2 values)
  for (const num2 of num2Values) {
    const headerCell = document.createElement('div');
    headerCell.className = 'cell header-cell';
    headerCell.textContent = num2.toString();
    gridEl.appendChild(headerCell);
  }
  
  // Data rows
  for (let i = 0; i < problemsNum; i++) {
    // Header column (num1 value)
    const headerCell = document.createElement('div');
    headerCell.className = 'cell header-cell';
    headerCell.textContent = num1Values[i]!.toString();
    gridEl.appendChild(headerCell);
    
    // Data cells
    for (let j = 0; j < problemsNum; j++) {
      const p = problems[i * problemsNum + j]!;
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset["id"] = p.id;

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

      cell.appendChild(input);
      gridEl.appendChild(cell);
    }
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

function updateStatus(correctCount?: number) {
  const c = typeof correctCount === 'number'
    ? correctCount
    : problems.reduce((acc, p) => {
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
    focusFirst();
  } else {
    stopTimer();
    startBtn.textContent = '開始';
  }
});

// 初期化
generateProblems();
