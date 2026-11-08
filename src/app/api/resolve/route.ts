import { NextResponse } from 'next/server';
import { paths, readJson, writeJson } from '@/lib/storage';

async function getSettledData() {
  try {
    const [statusRes, coreRes] = await Promise.all([
      fetch('https://api.squeekchain.com/v1/status'),
      fetch('https://api.squeekchain.com/v1/core'),
    ]);
    const status = await statusRes.json();
    const core = await coreRes.json();
    return { status, core };
  } catch (e) {
    return null;
  }
}

export async function POST() {
  const markets = readJson<any[]>(paths.MARKETS_FILE, []);
  const bets = readJson<any[]>(paths.BETS_FILE, []);
  const data = await getSettledData();

  let resolvedCount = 0;

  for (const market of markets) {
    if (market.status !== 'open') continue;
    if (new Date(market.resolveAt) > new Date()) continue;

    let outcome: 'yes' | 'no' | null = null;
    const cond = market.resolveCondition || {};

    if (data?.core?.status === 'available' || data?.status) {
      const blockHeight = Number(
        data.core?.core?.blockHeight ||
        data.status?.builder?.anchor?.blockHeight ||
        0
      );

      if (cond.type === 'blockHeight') {
        outcome = blockHeight >= cond.target ? 'yes' : 'no';
      } else if (cond.type === 'blockCount') {
        // Simplified: check if enough progress happened (demo logic)
        outcome = Math.random() > 0.4 ? 'yes' : 'no';
      } else {
        // Default demo resolve
        outcome = Math.random() > 0.5 ? 'yes' : 'no';
      }
    } else {
      outcome = Math.random() > 0.5 ? 'yes' : 'no';
    }

    if (outcome) {
      market.status = 'resolved';
      market.outcome = outcome;
      resolvedCount++;

      // Calculate simple payouts (demo: winners get 1.8x)
      for (const bet of bets) {
        if (bet.marketId === market.id && !bet.resolved) {
          bet.resolved = true;
          bet.payout = bet.side === outcome ? bet.amount * 1.8 : 0;
        }
      }
    }
  }

  writeJson(paths.MARKETS_FILE, markets);
  writeJson(paths.BETS_FILE, bets);

  return NextResponse.json({ resolved: resolvedCount });
}
