type OperationType = '+' | '-' | '*';

const VERSION = "1.0.0";

interface Problem{
  id: string;
  num1: number;
  num2: number;
  opType: OperationType;
  answer: number;
  userInput?: string;
}

const opSelect = document.getElementById('opSelect') as HTMLSelectElement;
const maxValueSelect = document.getElementById('maxValue') as HTMLSelectElement;

const regenerateBtn = document.getElementById('regenerateBtn') as HTMLButtonElement;
const startBtn = document.getElementById('startBtn') as HTMLButtonElement;

const gridEl = document.getElementById('grid') as HTMLDivElement;
const timerEl = document.getElementById('timer') as HTMLDivElement;
const versionEl = document.getElementById('version') as HTMLElement;

let problems: Problem[] = [];
let timerInterval: number | null = null;
let startTime: number | null = null;
let isInputEnabled = false;

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
  
  isInputEnabled = false;
  renderGrid();
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
      const problem = problems[i * problemsNum + j]!;
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset["id"] = problem.id;

      const input = document.createElement('input');
      input.type = 'text';
      input.setAttribute('inputmode', 'numeric');
      input.value = problem.userInput ?? '';
      input.disabled = !isInputEnabled;
      
      // Check if already answered correctly
      const parsed = problem.userInput ? Number(problem.userInput) : null;
      const alreadyCorrect = isNumCorrect(parsed, problem);
      let isAnswered = alreadyCorrect;
      
      if (alreadyCorrect) {
        cell.classList.add('correct');
        input.value = problem.answer.toString();
      }
      
      input.addEventListener('input', () => {
        // Filter out non-numeric characters
        const filteredValue = input.value.replace(/[^0-9]/g, '');
        if (input.value !== filteredValue) {
          input.value = filteredValue;
        }
        
        // If already answered correctly, forward input to next cell
        if (isAnswered) {
          const inputValue = input.value;
          const correctAnswer = problem.answer.toString();
          input.value = correctAnswer;
          
          // Extract the part that exceeds the correct answer
          let valueToForward = '';
          if (inputValue.startsWith(correctAnswer)) {
            // If input starts with correct answer, forward the remaining part
            valueToForward = inputValue.slice(correctAnswer.length);
          } else {
            // If input doesn't start with correct answer, forward the entire input
            // (This handles cases where user deletes and types new value)
            valueToForward = inputValue;
          }
          
          // Move input to next cell
          setTimeout(() => {
            if (valueToForward) {
              focusNextInput(problem.id, valueToForward);
            } else {
              focusNextInput(problem.id);
            }
          }, 0);
          return;
        }
        
        const userRaw = input.value.trim();
        problem.userInput = userRaw;
        
        // Auto-check answer
        const parsed = userRaw === '' ? null : Number(userRaw);
        const isCorrect = isNumCorrect(parsed, problem);
        
        if (isCorrect) {
          cell.classList.remove('wrong');
          cell.classList.add('correct');
          isAnswered = true;
          input.value = problem.answer.toString();
          // Move to next cell
          setTimeout(() => {
            focusNextInput(problem.id);
          }, 100);
        } else {
          cell.classList.remove('correct');
          if (userRaw !== '') {
            cell.classList.add('wrong');
          } else {
            cell.classList.remove('wrong');
          }
        }
      });

      input.addEventListener('keydown', (ev) => {
        // Handle ESC key to clear input
        if (ev.key === 'Escape') {
          ev.preventDefault();
          input.value = '';
          problem.userInput = '';
          cell.classList.remove('correct', 'wrong');
          isAnswered = false;
          return;
        }
        
        // If already answered correctly, allow input to be forwarded to next cell
        // Don't prevent default so input event can fire and handle forwarding
        if (isAnswered) {
          // Let input event handle forwarding the value
          return;
        }
        
        // Allow control keys (Backspace, Delete, Arrow keys, Tab, Enter, etc.)
        if (ev.ctrlKey || ev.metaKey || ev.altKey) {
          return;
        }
        
        // Allow special keys
        const allowedKeys = [
          'Backspace', 'Delete',
          'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
          'Home', 'End'
        ];
        if (allowedKeys.includes(ev.key)) {
          return;
        }
        
        // Allow only numeric keys (0-9)
        if (!/^[0-9]$/.test(ev.key)) {
          ev.preventDefault();
        }
      });

      // Prevent text selection on cell click
      cell.addEventListener('mousedown', (ev) => {
        // Prevent default selection behavior
        if (ev.target !== input) {
          ev.preventDefault();
          input.focus();
        }
      });

      cell.appendChild(input);
      gridEl.appendChild(cell);
    }
  }
}

function isNumCorrect(num: number | null, problem: Problem){
  const isCorrect = num !== null
                  && !Number.isNaN(num)
                  && num === problem.answer;
   return isCorrect;
}

function focusNextInput(currentId: string, valueToSet?: string) {
  const idx = problems.findIndex(p => p.id === currentId);
  if (idx >= 0 && idx < problems.length - 1) {
    const nextId = problems![idx + 1]!.id;
    const nextInput = gridEl.querySelector(`div.cell[data-id="${nextId}"] input`) as HTMLInputElement | null;
    if (nextInput) {
      if (valueToSet !== undefined) {
        nextInput.value = valueToSet;
        // Trigger input event to process the value
        nextInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      nextInput.focus();
    }
  }
}

function startTimer() {
  resetTimer();

  startTime = Date.now();
  timerInterval = window.setInterval(() => {
    if (!startTime) return;
    const elapsedMs = Date.now() - startTime;
    timerEl.textContent = formatTime(elapsedMs);
  }, 100);
}

function resetTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  startTime = null;
  timerEl.textContent = '00:00:000';
}

function formatTime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const mm = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const ss = (totalSec % 60).toString().padStart(2, '0');
  const mmm = (ms % 1000).toString().padStart(3, '0');
  return `${mm}:${ss}:${mmm}`;
}

function focusFirst() {
  const firstInput = gridEl.querySelector('input') as HTMLInputElement | null;
  firstInput?.focus();
}

function enableAllInputs() {
  const inputs = gridEl.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
  inputs.forEach(input => {
    input.disabled = false;
  });
}

// イベント登録
regenerateBtn.addEventListener('click', () => {
  generateProblems();
  focusFirst();
});
opSelect.addEventListener('change', () => generateProblems());
maxValueSelect.addEventListener('change', () => generateProblems());

startBtn.addEventListener('click', () => {
  isInputEnabled = true;
  enableAllInputs();
  startTimer();
  focusFirst();
});

// 初期化
versionEl.textContent = `(version ${VERSION})`;
generateProblems();
