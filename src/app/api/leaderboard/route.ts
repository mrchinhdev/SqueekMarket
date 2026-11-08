import { NextResponse } from 'next/server';
import { getBets } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = 20;
  const offset = (page - 1) * limit;

  const bets = await getBets();

  const scores: Record<string, { address: string; points: number; wins: number; bets: number }> = {};

  for (const bet of bets) {
    if (!bet.resolved) continue;
    const addr = bet.address.toLowerCase();
    if (!scores[addr]) scores[addr] = { address: addr, points: 0, wins: 0, bets: 0 };
    scores[addr].bets += 1;
    if (bet.payout && bet.payout > 0) {
      scores[addr].wins += 1;
      scores[addr].points += bet.currency === 'point' ? 10 : Math.floor(bet.payout);
    }
  }

  const leaderboard = Object.values(scores)
    .sort((a, b) => b.points - a.points)
    .slice(0, 100)
    .map((item, i) => ({ ...item, rank: i + 1 }));

  const totalPages = Math.ceil(leaderboard.length / limit) || 1;
  const pageData = leaderboard.slice(offset, offset + limit);

  return NextResponse.json({
    page,
    totalPages: Math.min(5, totalPages),
    data: pageData,
  });
}
