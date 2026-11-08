import { NextResponse } from 'next/server';
import { getBets, insertBet, updateMarket, getMarkets, Bet } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');
  const bets = await getBets(address || undefined);
  // Map to frontend expected shape
  const mapped = bets.map(b => ({
    id: b.id,
    marketId: b.market_id,
    address: b.address,
    side: b.side,
    amount: b.amount,
    currency: b.currency,
    timestamp: b.timestamp,
    resolved: b.resolved,
    payout: b.payout,
  }));
  return NextResponse.json(mapped);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { marketId, address, side } = body;

  if (!marketId || !address || !side) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const addr = address.toLowerCase();
  const existing = await getBets(addr);
  if (existing.some(b => b.market_id === marketId)) {
    return NextResponse.json({ error: 'You already placed a bet on this market' }, { status: 400 });
  }

  const pointsRes = await fetch(new URL('/api/points', req.url).origin + '/api/points', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, action: 'use' }),
  });
  if (!pointsRes.ok) {
    const err = await pointsRes.json();
    return NextResponse.json({ error: err.error || 'No bets remaining' }, { status: 400 });
  }

  const bet: Bet = {
    id: 'b' + Date.now() + Math.random().toString(36).slice(2, 6),
    market_id: marketId,
    address: addr,
    side,
    amount: 1,
    currency: 'point',
    timestamp: new Date().toISOString(),
  };

  const ok = await insertBet(bet);
  if (!ok) {
    return NextResponse.json({ error: 'Failed to save bet' }, { status: 500 });
  }

  const markets = await getMarkets();
  const market = markets.find(m => m.id === marketId);
  if (market) {
    await updateMarket(marketId, { volume: (market.volume || 0) + 1 });
  }

  return NextResponse.json({
    id: bet.id,
    marketId: bet.market_id,
    address: bet.address,
    side: bet.side,
    amount: bet.amount,
    currency: bet.currency,
    timestamp: bet.timestamp,
  });
}
