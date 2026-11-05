import { GRID_SIZE, createProblemSet, isCorrect, isOperationType, type OperationType, type Problem, type ProblemSet } from './problem.js';
import { clearTimes, getBestTime, getTimeHistory, saveTime, type TimeRecord } from './storage.js';
import { formatDate, formatOpType, formatTime } from './format.js';

const VERSION = "1.0.2";

/** 正解時に次のセルへ移動するまでの待ち時間 */
const NEXT_CELL_DELAY_MS = 100;
/** 不正解時に赤く表示してから入力を消すまでの時間 */
const WRONG_CLEAR_DELAY_MS = 200;
const TIMER_UPDATE_MS = 100;

function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element not found: #${id}`);
  return el as T;
}

const opSelect = getEl<HTMLSelectElement>('opSelect');
const maxValueSlider = getEl<HTMLInputElement>('maxValue');
const maxValueDisplay = getEl<HTMLSpanElement>('maxValueDisplay');
const regenerateBtn = getEl<HTMLButtonElement>('regenerateBtn');
const startBtn = getEl<HTMLButtonElement>('startBtn');
const gridEl = getEl<HTMLDivElement>('grid');
const timerEl = getEl<HTMLDivElement>('timer');
const versionEl = getEl<HTMLElement>('version');
const bestTimeEl = getEl<HTMLDivElement>('bestTime');
const timeHistoryEl = getEl<HTMLDivElement>('timeHistory');
const clearHistoryBtn = getEl<HTMLButtonElement>('clearHistoryBtn');

let problemSet: ProblemSet;
let timerInterval: number | null = null;
let startTime: number | null = null;
let isInputEnabled = false;

// ---------------------------------------------------------------------------
// 設定
// ---------------------------------------------------------------------------

function getSettings(): { op: OperationType; maxValue: number } {
  const op = isOperationType(opSelect.value) ? opSelect.value : '+';
  return { op, maxValue: Number(maxValueSlider.value) };
}

// ---------------------------------------------------------------------------
// グリッド描画
// ---------------------------------------------------------------------------

function createCell(text: string, row: number, col: number, ...classes: string[]): HTMLDivElement {
  const cell = document.createElement('div');
  cell.classList.add('cell', ...classes);
  if (row === GRID_SIZE) cell.classList.add('last-row');
  cell.dataset["row"] = row.toString();
  cell.dataset["col"] = col.toString();
  cell.textContent = text;
  return cell;
}

function renderGrid(): void {
  const { opType, rowValues, colValues, problems } = problemSet;
  const fragment = document.createDocumentFragment();

  fragment.appendChild(createCell(formatOpType(opType), 0, 0, 'header-cell', 'op-cell'));
  colValues.forEach((v, c) => fragment.appendChild(createCell(v.toString(), 0, c + 1, 'header-cell')));

  rowValues.forEach((v, r) => {
    fragment.appendChild(createCell(v.toString(), r + 1, 0, 'header-cell'));
    for (let c = 0; c < GRID_SIZE; c++) {
      const index = r * GRID_SIZE + c;
      fragment.appendChild(createProblemCell(problems[index]!, index, r + 1, c + 1));
    }
  });

  gridEl.replaceChildren(fragment);
}

function createProblemCell(problem: Problem, index: number, row: number, col: number): HTMLDivElement {
  const cell = createCell('', row, col);
  cell.dataset["index"] = index.toString();

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.disabled = !isInputEnabled;
  input.value = problem.userInput;
  cell.classList.toggle('correct', isCorrect(problem));

  input.addEventListener('input', () => onCellInput(problem, index, cell, input));
  input.addEventListener('keydown', (ev) => onCellKeyDown(ev, problem, cell, input));
  input.addEventListener('focus', () => highlightRowAndColumn(row, col));
  input.addEventListener('blur', clearHighlight);

  // セル内の余白クリックでテキスト選択させずに入力欄へフォーカス
  cell.addEventListener('mousedown', (ev) => {
    if (ev.target !== input) {
      ev.preventDefault();
      input.focus();
    }
  });

  cell.appendChild(input);
  return cell;
}

function onCellInput(problem: Problem, index: number, cell: HTMLDivElement, input: HTMLInputElement): void {
  const value = input.value.replace(/[^0-9]/g, '');
  const correctAnswer = problem.answer.toString();

  // 正解済みのセルに入力された分は次のセルへ送る
  if (isCorrect(problem)) {
    input.value = correctAnswer;
    const forward = value.startsWith(correctAnswer) ? value.slice(correctAnswer.length) : value;
    setTimeout(() => focusInput(index + 1, forward || undefined), 0);
    return;
  }

  input.value = value;
  problem.userInput = value;

  if (isCorrect(problem)) {
    cell.classList.remove('wrong');
    cell.classList.add('correct');
    if (problemSet.problems.every(isCorrect)) {
      handleAllCorrect();
      return;
    }
    setTimeout(() => focusInput(index + 1), NEXT_CELL_DELAY_MS);
    return;
  }

  cell.classList.remove('correct');
  cell.classList.toggle('wrong', value !== '');

  // 正解の桁数に達しても不正解なら、一瞬赤く表示してから入力をクリア
  if (value.length >= correctAnswer.length) {
    setTimeout(() => {
      input.value = '';
      problem.userInput = '';
      cell.classList.remove('wrong');
    }, WRONG_CLEAR_DELAY_MS);
  }
}

const ALLOWED_KEYS = new Set([
  'Backspace', 'Delete',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Home', 'End', 'Tab',
]);

function onCellKeyDown(ev: KeyboardEvent, problem: Problem, cell: HTMLDivElement, input: HTMLInputElement): void {
  if (ev.key === 'Escape') {
    ev.preventDefault();
    input.value = '';
    problem.userInput = '';
    cell.classList.remove('correct', 'wrong');
    return;
  }

  // 正解済みセルへの入力は input イベントで次のセルへ送るので止めない
  if (isCorrect(problem)) return;
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (ALLOWED_KEYS.has(ev.key)) return;

  if (!/^[0-9]$/.test(ev.key)) {
    ev.preventDefault();
  }
}

function getInput(index: number): HTMLInputElement | null {
  return gridEl.querySelector<HTMLInputElement>(`.cell[data-index="${index}"] input`);
}

/** 指定セルへフォーカスする。value 指定時はその値を入力したものとして処理する */
function focusInput(index: number, value?: string): void {
  const input = getInput(index);
  if (!input) return;
  if (value !== undefined) {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  input.focus();
}

function highlightRowAndColumn(row: number, col: number): void {
  clearHighlight();
  gridEl.querySelectorAll(`.cell[data-row="${row}"]`).forEach(c => c.classList.add('highlight-row'));
  gridEl.querySelectorAll(`.cell[data-col="${col}"]`).forEach(c => c.classList.add('highlight-col'));
}

function clearHighlight(): void {
  gridEl.querySelectorAll('.highlight-row, .highlight-col')
    .forEach(c => c.classList.remove('highlight-row', 'highlight-col'));
}

// ---------------------------------------------------------------------------
// タイマー
// ---------------------------------------------------------------------------

function stopTimer(): void {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function resetTimer(): void {
  stopTimer();
  startTime = null;
  timerEl.textContent = formatTime(0);
}

function startTimer(): void {
  resetTimer();
  const start = Date.now();
  startTime = start;
  timerInterval = window.setInterval(() => {
    timerEl.textContent = formatTime(Date.now() - start);
  }, TIMER_UPDATE_MS);
}

// ---------------------------------------------------------------------------
// 記録表示
// ---------------------------------------------------------------------------

function formatRecord(record: TimeRecord): string {
  return `${formatTime(record.timeMs)} (${formatOpType(record.opType)}, max:${record.maxValue}, ${formatDate(record.date)})`;
}

function createHistoryItem(text: string): HTMLDivElement {
  const item = document.createElement('div');
  item.className = 'history-item';
  item.textContent = text;
  return item;
}

function updateFooterDisplay(): void {
  const { op, maxValue } = getSettings();

  const best = getBestTime(op, maxValue);
  bestTimeEl.textContent = `Best: ${best ? formatRecord(best) : '-'}`;

  // "History" ラベルは残して項目だけ差し替える
  timeHistoryEl.querySelectorAll('.history-item').forEach(item => item.remove());
  const history = getTimeHistory(op, maxValue);
  const items = history.length > 0
    ? history.map((record, i) => createHistoryItem(`${i + 1}. ${formatRecord(record)}`))
    : [createHistoryItem('-')];
  timeHistoryEl.append(...items);
}

// ---------------------------------------------------------------------------
// ゲーム進行
// ---------------------------------------------------------------------------

function generateProblems(): void {
  const { op, maxValue } = getSettings();
  problemSet = createProblemSet(op, maxValue);
  isInputEnabled = false;
  renderGrid();
  resetTimer();
  updateFooterDisplay();
}

function startGame(): void {
  problemSet.problems.forEach(p => { p.userInput = ''; });
  isInputEnabled = true;
  renderGrid();
  startTimer();
  focusInput(0);
}

function handleAllCorrect(): void {
  if (startTime === null) return;

  const elapsedMs = Date.now() - startTime;
  stopTimer();

  const { op, maxValue } = getSettings();
  const { isNewBest, best } = saveTime(op, maxValue, elapsedMs);
  updateFooterDisplay();

  const bestMessage = isNewBest ? 'New best time!' : `Best time: ${formatTime(best.timeMs)}`;
  alert(`Congratulations! All correct!\nTime: ${formatTime(elapsedMs)}\n${bestMessage}`);
  generateProblems();
}

function clearHistory(): void {
  const { op, maxValue } = getSettings();
  clearTimes(op, maxValue);
  updateFooterDisplay();
}

// ---------------------------------------------------------------------------
// イベント登録・初期化
// ---------------------------------------------------------------------------

window.addEventListener('keydown', (ev) => {
  // Ctrl+S などの修飾キー付きは対象外
  if (ev.key === 's' && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
    startGame();
  }
});

opSelect.addEventListener('change', generateProblems);

maxValueSlider.addEventListener('input', () => {
  maxValueDisplay.textContent = maxValueSlider.value;
  generateProblems();
});

regenerateBtn.addEventListener('click', () => {
  generateProblems();
  focusInput(0);
});

startBtn.addEventListener('click', startGame);
clearHistoryBtn.addEventListener('click', clearHistory);

document.documentElement.style.setProperty('--grid-size', (GRID_SIZE + 1).toString());
versionEl.textContent = `(version ${VERSION})`;
generateProblems();
