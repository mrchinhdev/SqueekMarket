import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const MARKETS_FILE = path.join(DATA_DIR, 'markets.json');
const BETS_FILE = path.join(DATA_DIR, 'bets.json');
const POINTS_FILE = path.join(DATA_DIR, 'points.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function readJson<T>(file: string, fallback: T): T {
  ensureDataDir();
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
    return fallback;
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return fallback;
  }
}

export function writeJson(file: string, data: any) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export const paths = { MARKETS_FILE, BETS_FILE, POINTS_FILE };
