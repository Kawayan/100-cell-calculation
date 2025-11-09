const VERSION = "1.0.1";
const PROBLEMS_ROW_COL_NUM = 10;
const MAX_History = 100;

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
const bestTimeEl = document.getElementById('bestTime') as HTMLDivElement;
const timeHistoryEl = document.getElementById('timeHistory') as HTMLDivElement;
const clearHistoryBtn = document.getElementById('clearHistoryBtn') as HTMLButtonElement;

let problems: Problem[] = [];
let timerInterval: number | null = null;
let startTime: number | null = null;
let isInputEnabled = false;

type OperationType = '+' | '-' | '*';

interface Problem{
  id: string;
  num1: number;
  num2: number;
  opType: OperationType;
  answer: number;
  userInput?: string;
}

interface TimeRecord {
  timeMs: number;
  date: string; // ISO 8601 format
  opType: OperationType;
  maxValue: number;
}

function getRandInt(min: number, max: number): number {
  const minCeil = Math.ceil(min);
  const maxFloor = Math.floor(max);
  return Math.floor(Math.random() * (maxFloor - minCeil + 1)) + minCeil;
}

function getNumArray(min: number, max: number, size: number): number[] {
  const range = max - min + 1;
  if (size > range * 2) {
    throw new Error(`Cannot generate ${size} values from range [${min}, ${max}] with max 2 duplicates`);
  }

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

function setProblems(opType: OperationType, max: number): void{
  let answer: number;

  const min = 1;  
  const num1Values = getNumArray(min, max, PROBLEMS_ROW_COL_NUM);
  
  const num2Max = opType === '*' ? Math.min(2, max) : max;
  const num2Values = getNumArray(min, num2Max, PROBLEMS_ROW_COL_NUM);
  
  // Generate problems
  problems = [];
  for (let r = 0; r < PROBLEMS_ROW_COL_NUM; r++) {
    const num1 = num1Values[r]!;
    
    for (let c = 0; c < PROBLEMS_ROW_COL_NUM; c++) {
      const num2 = num2Values[c]!;
      
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
  setProblems(op, maxVal);
  
  isInputEnabled = false;
  renderGrid();
  resetTimer();
  updateFooterDisplay();
}

function renderGrid() {
  gridEl.innerHTML = '';
  
  // Set CSS variable for grid size
  const gridSize = PROBLEMS_ROW_COL_NUM + 1;
  document.documentElement.style.setProperty('--grid-size', gridSize.toString());
  
  // Extract unique num1 and num2 values for headers
  const num1Values: number[] = [];
  const num2Values: number[] = [];
  
  for (let r = 0; r < PROBLEMS_ROW_COL_NUM; r++) {
    const rowProblem = problems[r * PROBLEMS_ROW_COL_NUM];
    if (rowProblem) {
      num1Values.push(rowProblem.num1);
    }
  }
  
  for (let c = 0; c < PROBLEMS_ROW_COL_NUM; c++) {
    const colProblem = problems[c];
    if (colProblem) {
      num2Values.push(colProblem.num2);
    }
  }
  
  // Top-left empty cell
  const emptyCell = document.createElement('div');
  emptyCell.className = 'cell header-cell';
  emptyCell.dataset["row"] = '0'; // Header row
  emptyCell.dataset["col"] = '0'; // Header column
  gridEl.appendChild(emptyCell);
  
  // Header row (num2 values)
  for (let j = 0; j < num2Values.length; j++) {
    const headerCell = document.createElement('div');
    headerCell.className = 'cell header-cell';
    headerCell.textContent = num2Values[j]!.toString();
    headerCell.dataset["row"] = '0'; // Header row
    headerCell.dataset["col"] = (j + 1).toString(); // Column index (1-based)
    gridEl.appendChild(headerCell);
  }
  
  // Data rows
  for (let r = 0; r < PROBLEMS_ROW_COL_NUM; r++) {
    // Header column
    const headerCell = document.createElement('div');
    headerCell.className = 'cell header-cell';
    
    if (r === PROBLEMS_ROW_COL_NUM - 1) {
      headerCell.classList.add('last-row');
    }
    headerCell.textContent = num1Values[r]!.toString();
    headerCell.dataset["row"] = (r + 1).toString();
    headerCell.dataset["col"] = '0';
    gridEl.appendChild(headerCell);
    
    // Data cells
    for (let c = 0; c < PROBLEMS_ROW_COL_NUM; c++) {
      const problem = problems[r * PROBLEMS_ROW_COL_NUM + c]!;
      const cell = document.createElement('div');
      cell.className = 'cell';
      
      if (r === PROBLEMS_ROW_COL_NUM - 1) {
        cell.classList.add('last-row');
      }
      cell.dataset["id"] = problem.id;
      cell.dataset["row"] = (r + 1).toString();
      cell.dataset["col"] = (c + 1).toString();

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
          
          // Check if all problems are correct
          if (checkAllCorrect()) {
            handleAllCorrect();
          }
          
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

      input.addEventListener('focus', () => {
        highlightRowAndColumn(cell);
      });

      input.addEventListener('blur', () => {
        clearHighlight();
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
        
        // Control keys
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

function checkAllCorrect(): boolean {
  return problems.every(problem => {
    const parsed = problem.userInput ? Number(problem.userInput) : null;
    return isNumCorrect(parsed, problem);
  });
}

function setCookie(name: string, value: string, days: number = 365) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/`;
}

function getHistoryFromCookie(name: string): string | null {
  const nameEQ = `${name}=`;
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    if (!c) continue;
    while (c.charAt(0) === ' ') {
      c = c.substring(1, c.length);
    }
    if (c.indexOf(nameEQ) === 0) {
      return c.substring(nameEQ.length, c.length);
    }
  }
  return null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
}

function saveBestTime(opType: OperationType, maxValue: number, timeMs: number) {
  const key = `bestTime_${opType}_${maxValue}`;
  const savedTime = getHistoryFromCookie(key);
  
  let isNewBest = false;
  if (savedTime === null) {
    isNewBest = true;
  } else {
    try {
      const savedRecord: TimeRecord = JSON.parse(savedTime);
      if (timeMs < savedRecord.timeMs) {
        isNewBest = true;
      }
    } catch {
      console.log("Can not parse a teime record.");
    }
  }
  
  if (isNewBest) {
    const record: TimeRecord = {
      timeMs: timeMs,
      date: new Date().toISOString(),
      opType: opType,
      maxValue: maxValue
    };
    setCookie(key, JSON.stringify(record));
  }
  return isNewBest;
}

function getBestTime(opType: OperationType, maxValue: number): TimeRecord | null {
  const key = `bestTime_${opType}_${maxValue}`;
  const savedTime = getHistoryFromCookie(key);
  if (!savedTime)
     return null;
  
  try{
    const record: TimeRecord = JSON.parse(savedTime);
    return record;
  } catch{
    console.log("Can not parse a teime record.");
    return null;
  }
}

function saveTimeHistory(opType: OperationType, maxValue: number, timeMs: number) {
  const key = `timeHistory_${opType}_${maxValue}`;
  const savedHistory = getHistoryFromCookie(key);
  let history: TimeRecord[] = [];
  
  if (savedHistory) {
    try {
      const parsed = JSON.parse(savedHistory);
      if (Array.isArray(parsed)) {
        history = parsed as TimeRecord[];
      }
    } catch {
      console.log("Can not parse a teime record.");
    }
  }
  
  // Add new time record to history
  const record: TimeRecord = {
    timeMs: timeMs,
    date: new Date().toISOString(),
    opType: opType,
    maxValue: maxValue
  };
  history.push(record);
  
  if (history.length > MAX_History) {
    history = history.slice(-MAX_History);
  }
  
  setCookie(key, JSON.stringify(history));
}

function getTimeHistory(opType: OperationType, maxValue: number): TimeRecord[] {
  const key = `timeHistory_${opType}_${maxValue}`;
  const savedHistory = getHistoryFromCookie(key);
  
  if (savedHistory) {
    try {
      const parsed = JSON.parse(savedHistory);
      if (Array.isArray(parsed)) {
        return parsed as TimeRecord[];
      }
    } catch {
    }
  }
  return [];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function formatOpType(opType: OperationType): string {
  switch (opType) {
    case '+': return '+';
    case '-': return '-';
    case '*': return '×';
    default: return opType;
  }
}

function clearHistory() {
  const op = opSelect.value as OperationType;
  const maxVal = Number(maxValueSelect.value);
  const historyKey = `timeHistory_${op}_${maxVal}`;
  const bestTimeKey = `bestTime_${op}_${maxVal}`;
  deleteCookie(historyKey);
  deleteCookie(bestTimeKey);
  updateFooterDisplay();
}

function updateFooterDisplay() {
  const op = opSelect.value as OperationType;
  const maxVal = Number(maxValueSelect.value);
  
  // Update best time
  if (bestTimeEl) {
    const bestTime = getBestTime(op, maxVal);
    if (bestTime) {
      const dateStr = formatDate(bestTime.date);
      const opStr = formatOpType(bestTime.opType);
      bestTimeEl.textContent = `Best: ${formatTime(bestTime.timeMs)} (${opStr}, max:${bestTime.maxValue}, ${dateStr})`;
    } else {
      bestTimeEl.textContent = 'Best: -';
    }
  }
  
  // Update history
  const history = getTimeHistory(op, maxVal);
  // Clear existing history items (keep the "History:" label)
  const existingItems = timeHistoryEl.querySelectorAll('.history-item');
  existingItems.forEach(item => item.remove());
  
  if (history.length > 0) {
    // Add each history item as a separate line
    history.forEach((record, index) => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      const dateStr = formatDate(record.date);
      const opStr = formatOpType(record.opType);
      historyItem.textContent = `${index + 1}. ${formatTime(record.timeMs)} (${opStr}, max:${record.maxValue}, ${dateStr})`;
      timeHistoryEl.appendChild(historyItem);
    });
  } else {
    const noHistory = document.createElement('div');
    noHistory.className = 'history-item';
    noHistory.textContent = '-';
    timeHistoryEl.appendChild(noHistory);
  }
}

function handleAllCorrect() {
  if (!startTime)
     return;
  
  const elapsedMs = Date.now() - startTime;
  const op = opSelect.value as OperationType;
  const maxVal = Number(maxValueSelect.value);
  
  // Get best time before saving (in case it's not a new best)
  const currentBestTime = getBestTime(op, maxVal);
  
  const isNewBest = saveBestTime(op, maxVal, elapsedMs);
  saveTimeHistory(op, maxVal, elapsedMs);
  
  // Stop timer
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  // Update footer display
  updateFooterDisplay();
  
  // Show completion message
  // Use the saved best time if it's a new best, otherwise use the current best time
  const bestTime = isNewBest ? getBestTime(op, maxVal) : currentBestTime;
  if (isNewBest) {
    alert(`Congratulations! All correct!\nTime: ${formatTime(elapsedMs)}\nNew best time!`);
  } else {
    const bestTimeStr = bestTime ? formatTime(bestTime.timeMs) : 'N/A';
    alert(`Congratulations! All correct!\nTime: ${formatTime(elapsedMs)}\nBest time: ${bestTimeStr}`);
  }
  generateProblems();
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

function highlightRowAndColumn(cell: HTMLDivElement) {
  // Clear previous highlights
  clearHighlight();
  
  const row = cell.dataset["row"];
  const col = cell.dataset["col"];
  
  if (!row || !col) return;
  
  // Highlight all cells in the same row
  const rowCells = gridEl.querySelectorAll(`.cell[data-row="${row}"]`);
  rowCells.forEach(c => c.classList.add('highlight-row'));
  
  // Highlight all cells in the same column
  const colCells = gridEl.querySelectorAll(`.cell[data-col="${col}"]`);
  colCells.forEach(c => c.classList.add('highlight-col'));
}

function clearHighlight() {
  const highlightedCells = gridEl.querySelectorAll('.cell.highlight-row, .cell.highlight-col');
  highlightedCells.forEach(cell => {
    cell.classList.remove('highlight-row', 'highlight-col');
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

clearHistoryBtn.addEventListener('click', () => {
  clearHistory();
});

// 初期化
versionEl.textContent = `(version ${VERSION})`;
generateProblems();
updateFooterDisplay();
