import { NextResponse } from 'next/server';
import { getBets, insertBet, updateMarket, getMarkets, Bet } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');
  const bets = await getBets(address || undefined);
  return NextResponse.json(bets);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { marketId, address, side } = body;

  if (!marketId || !address || !side) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const addr = address.toLowerCase();
  const existing = await getBets(addr);
  if (existing.some(b => b.marketId === marketId)) {
    return NextResponse.json({ error: 'You already placed a bet on this market' }, { status: 400 });
  }

  // Use one bet slot via points API
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
    marketId,
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

  // Increment market volume
  const markets = await getMarkets();
  const market = markets.find(m => m.id === marketId);
  if (market) {
    await updateMarket(marketId, { volume: (market.volume || 0) + 1 });
  }

  return NextResponse.json(bet);
}
