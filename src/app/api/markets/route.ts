import { NextResponse } from 'next/server';
import { paths, readJson, writeJson } from '@/lib/storage';

type Market = {
  id: string;
  question: string;
  type: string;
  status: 'open' | 'resolved';
  resolveAt: string;
  outcome?: 'yes' | 'no';
  yesPrice: number;
  volume: number;
  createdAt: string;
  day: string;
  hour: number;
  resolveCondition: any;
};

const TEMPLATES = [
  { q: 'Will Squeektoshi complete more than 8 blocks in the next 3 hours?', type: 'count', cond: { type: 'blockCount', over: 8 }, price: 0.58 },
  { q: 'Will the next settled round exceed 35,000 work units?', type: 'round', cond: { type: 'roundWork', threshold: 35000 }, price: 0.45 },
  { q: 'Will block height increase by at least 12 before midnight UTC?', type: 'milestone', cond: { type: 'blockDelta', delta: 12 }, price: 0.62 },
  { q: 'Will the wheel stay active for more than 40% of the next hour?', type: 'activity', cond: { type: 'activity', percent: 40 }, price: 0.51 },
  { q: 'Will more than 5 rounds be settled in the next 90 minutes?', type: 'rounds', cond: { type: 'rounds', count: 5 }, price: 0.67 },
  { q: 'Will difficulty rise in the next 2 rounds?', type: 'difficulty', cond: { type: 'difficultyUp' }, price: 0.49 },
  { q: 'Will total work in the next 4 hours exceed the previous 4 hours?', type: 'compare', cond: { type: 'workCompare', hours: 4 }, price: 0.54 },
  { q: 'Will Squeektoshi hit a new daily high in RPM today?', type: 'rpm', cond: { type: 'rpmHigh' }, price: 0.41 },
  { q: 'Will at least 3 checkpoints happen before 18:00 UTC?', type: 'checkpoint', cond: { type: 'checkpoints', count: 3 }, price: 0.59 },
  { q: 'Will the hamster run continuously for 25+ minutes today?', type: 'streak', cond: { type: 'streak', minutes: 25 }, price: 0.38 },
  { q: 'Will settled work in the next round be above average of last 5 rounds?', type: 'average', cond: { type: 'aboveAverage' }, price: 0.56 },
  { q: 'Will more than 10 Squeek blocks be completed by the end of the day?', type: 'daily', cond: { type: 'dailyBlocks', over: 10 }, price: 0.63 },
];

function generateMarket(day: string, index: number, hour: number): Market {
  const t = TEMPLATES[index % TEMPLATES.length];
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setUTCHours(23, 59, 59, 999);

  return {
    id: `${day}-${index}-${Date.now() % 10000}`,
    question: t.q,
    type: t.type,
    status: 'open',
    resolveAt: endOfDay.toISOString(),
    yesPrice: t.price,
    volume: 0,
    createdAt: now.toISOString(),
    day,
    hour,
    resolveCondition: t.cond,
  };
}

export async function GET() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentHour = now.getUTCHours();

  let markets = readJson<Market[]>(paths.MARKETS_FILE, []);
  const todayMarkets = markets.filter(m => m.day === today);

  // At 00:00 UTC: ensure 12 markets exist
  // Every hour after: add 1 more if not present
  const expectedCount = 12 + currentHour;

  if (todayMarkets.length < expectedCount) {
    const existingIndexes = new Set(todayMarkets.map(m => parseInt(m.id.split('-')[1] || '0')));
    const newMarkets: Market[] = [];

    for (let i = 0; i < expectedCount; i++) {
      if (!existingIndexes.has(i)) {
        newMarkets.push(generateMarket(today, i, i < 12 ? 0 : i - 11));
      }
    }

    if (newMarkets.length > 0) {
      markets = [...markets.filter(m => m.day !== today), ...todayMarkets, ...newMarkets];
      writeJson(paths.MARKETS_FILE, markets);
    }
  }

  const result = markets
    .filter(m => m.day === today)
    .filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i) // dedupe
    .sort((a, b) => a.id.localeCompare(b.id));
  return NextResponse.json(result);
}
