import { NextResponse } from 'next/server';
import { getMarkets, updateMarket, getBets, updateBet } from '@/lib/db';

export async function POST() {
  const markets = await getMarkets();
  const bets = await getBets();
  let resolvedCount = 0;

  let data: any = null;
  try {
    const res = await fetch('https://api.squeekchain.com/v1/status');
    data = await res.json();
  } catch {}

  for (const market of markets) {
    if (market.status !== 'open') continue;
    if (new Date(market.resolve_at) > new Date()) continue;

    let outcome: 'yes' | 'no' | null = null;
    const cond = market.resolve_condition || {};

    if (data) {
      const blockHeight = Number(
        data.builder?.anchor?.blockHeight ||
        data.builder?.projected?.blockHeight ||
        0
      );

      if (cond.type === 'blockHeight') {
        outcome = blockHeight >= cond.target ? 'yes' : 'no';
      } else if (cond.type === 'blockCount') {
        outcome = Math.random() > 0.4 ? 'yes' : 'no';
      } else {
        outcome = Math.random() > 0.5 ? 'yes' : 'no';
      }
    } else {
      outcome = Math.random() > 0.5 ? 'yes' : 'no';
    }

    if (outcome) {
      await updateMarket(market.id, { status: 'resolved', outcome });
      resolvedCount++;

      for (const bet of bets) {
        if (bet.market_id === market.id && !bet.resolved) {
          const payout = bet.side === outcome ? bet.amount * 1.8 : 0;
          await updateBet(bet.id, { resolved: true, payout });
        }
      }
    }
  }

  return NextResponse.json({ resolved: resolvedCount });
}
