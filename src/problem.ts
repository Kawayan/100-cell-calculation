export type OperationType = '+' | '-' | '*';

export const GRID_SIZE = 10;

export interface Problem {
  num1: number;
  num2: number;
  answer: number;
  userInput: string;
}

export interface ProblemSet {
  opType: OperationType;
  /** 左端の見出し列の値 */
  rowValues: number[];
  /** 上端の見出し行の値 */
  colValues: number[];
  /** 行優先で並んだ GRID_SIZE × GRID_SIZE 個の問題 */
  problems: Problem[];
}

const MIN_VALUE = 1;
/** 掛け算の右側の数の上限（九九の範囲） */
const MUL_NUM2_MAX = 9;

function getRandInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * [min, max] の乱数を size 個生成する。
 * 同じ数が連続しないこと、同じ数の出現回数を抑えることで問題の偏りを防ぐ。
 */
function getNumArray(min: number, max: number, size: number): number[] {
  const range = max - min + 1;
  // 範囲が狭い場合は重複上限を緩めて必ず生成できるようにする
  const maxDuplicates = Math.max(2, Math.ceil(size / range));

  const results: number[] = [];
  while (results.length < size) {
    const num = getRandInt(min, max);
    const isSameAsPrev = range > 1 && results.at(-1) === num;
    const isTooMany = results.filter(n => n === num).length >= maxDuplicates;
    if (!isSameAsPrev && !isTooMany) {
      results.push(num);
    }
  }
  return results;
}

export function isOperationType(value: string): value is OperationType {
  return value === '+' || value === '-' || value === '*';
}

function calcAnswer(opType: OperationType, rowValue: number, colValue: number): { num1: number; num2: number; answer: number } {
  switch (opType) {
    case '+':
      return { num1: rowValue, num2: colValue, answer: rowValue + colValue };
    case '-': {
      // 答えが負にならないよう大きい方から引く
      const num1 = Math.max(rowValue, colValue);
      const num2 = Math.min(rowValue, colValue);
      return { num1, num2, answer: num1 - num2 };
    }
    case '*':
      return { num1: rowValue, num2: colValue, answer: rowValue * colValue };
  }
}

export function createProblemSet(opType: OperationType, max: number): ProblemSet {
  const rowValues = getNumArray(MIN_VALUE, max, GRID_SIZE);
  const colMax = opType === '*' ? Math.min(MUL_NUM2_MAX, max) : max;
  const colValues = getNumArray(MIN_VALUE, colMax, GRID_SIZE);

  const problems = rowValues.flatMap(r =>
    colValues.map(c => ({ ...calcAnswer(opType, r, c), userInput: '' })));

  return { opType, rowValues, colValues, problems };
}

export function isCorrect(problem: Problem): boolean {
  return problem.userInput !== '' && Number(problem.userInput) === problem.answer;
}
