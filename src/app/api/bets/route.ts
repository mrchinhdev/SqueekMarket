import { NextResponse } from 'next/server';
import { paths, readJson, writeJson } from '@/lib/storage';

type Bet = {
  id: string;
  marketId: string;
  address: string;
  side: 'yes' | 'no';
  amount: number;
  currency: 'point';
  timestamp: string;
  resolved?: boolean;
  payout?: number;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');
  const bets = readJson<Bet[]>(paths.BETS_FILE, []);
  if (address) {
    return NextResponse.json(bets.filter(b => b.address.toLowerCase() === address.toLowerCase()));
  }
  return NextResponse.json(bets);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { marketId, address, side } = body;

  if (!marketId || !address || !side) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const bets = readJson<Bet[]>(paths.BETS_FILE, []);
  const addr = address.toLowerCase();

  // Check if user already bet on this market
  const alreadyBet = bets.some(b => b.marketId === marketId && b.address === addr);
  if (alreadyBet) {
    return NextResponse.json({ error: 'You already placed a bet on this market' }, { status: 400 });
  }

  // Use one bet slot
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
    id: 'b' + Date.now(),
    marketId,
    address: addr,
    side,
    amount: 1,
    currency: 'point',
    timestamp: new Date().toISOString(),
  };
  bets.push(bet);
  writeJson(paths.BETS_FILE, bets);

  // Update market volume
  const markets = readJson<any[]>(paths.MARKETS_FILE, []);
  const market = markets.find(m => m.id === marketId);
  if (market) {
    market.volume += 1;
    writeJson(paths.MARKETS_FILE, markets);
  }

  return NextResponse.json(bet);
}
