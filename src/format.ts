import type { OperationType } from './problem.js';

const pad = (n: number, len = 2) => n.toString().padStart(len, '0');

/** ミリ秒を "mm:ss:mmm" 形式に整形する */
export function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  return `${pad(Math.floor(totalSec / 60))}:${pad(totalSec % 60)}:${pad(ms % 1000, 3)}`;
}

/** ISO 8601 文字列を "YYYY-MM-DD hh:mm" 形式に整形する */
export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const OP_SYMBOLS: Record<OperationType, string> = {
  '+': '+',
  '-': '−',
  '*': '×',
};

/** 演算子を表示用の記号に変換する */
export function formatOpType(opType: OperationType): string {
  return OP_SYMBOLS[opType];
}
