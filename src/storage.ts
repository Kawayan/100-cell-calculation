import type { OperationType } from './problem.js';

export interface TimeRecord {
  timeMs: number;
  date: string; // ISO 8601 format
  opType: OperationType;
  maxValue: number;
}

const MAX_HISTORY = 100;
const COOKIE_DAYS = 365;

function setCookie(name: string, value: string, days = COOKIE_DAYS): void {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${value};expires=${expires};path=/`;
}

function getCookie(name: string): string | null {
  const prefix = `${name}=`;
  const entry = document.cookie
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : null;
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
}

function readJsonCookie<T>(name: string, isValid: (v: unknown) => boolean): T | null {
  const raw = getCookie(name);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed as T : null;
  } catch {
    console.warn(`Cannot parse time record: ${name}`);
    return null;
  }
}

const bestTimeKey = (opType: OperationType, maxValue: number) => `bestTime_${opType}_${maxValue}`;
const historyKey = (opType: OperationType, maxValue: number) => `timeHistory_${opType}_${maxValue}`;

const isRecord = (v: unknown) => typeof v === 'object' && v !== null && typeof (v as TimeRecord).timeMs === 'number';

export function getBestTime(opType: OperationType, maxValue: number): TimeRecord | null {
  return readJsonCookie<TimeRecord>(bestTimeKey(opType, maxValue), isRecord);
}

export function getTimeHistory(opType: OperationType, maxValue: number): TimeRecord[] {
  return readJsonCookie<TimeRecord[]>(historyKey(opType, maxValue), Array.isArray) ?? [];
}

/**
 * クリアタイムを履歴に追加し、自己ベストなら更新する。
 * @returns 自己ベストを更新したかどうかと、保存後のベスト記録
 */
export function saveTime(opType: OperationType, maxValue: number, timeMs: number): { isNewBest: boolean; best: TimeRecord } {
  const record: TimeRecord = { timeMs, date: new Date().toISOString(), opType, maxValue };

  const history = [...getTimeHistory(opType, maxValue), record].slice(-MAX_HISTORY);
  setCookie(historyKey(opType, maxValue), JSON.stringify(history));

  const prevBest = getBestTime(opType, maxValue);
  const isNewBest = prevBest === null || timeMs < prevBest.timeMs;
  if (isNewBest) {
    setCookie(bestTimeKey(opType, maxValue), JSON.stringify(record));
  }
  return { isNewBest, best: isNewBest ? record : prevBest };
}

export function clearTimes(opType: OperationType, maxValue: number): void {
  deleteCookie(historyKey(opType, maxValue));
  deleteCookie(bestTimeKey(opType, maxValue));
}
