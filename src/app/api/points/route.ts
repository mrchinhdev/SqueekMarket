import { NextResponse } from 'next/server';
import { paths, readJson, writeJson } from '@/lib/storage';

type UserData = {
  date: string;
  freeUsed: number;
  purchased: number;
  totalPoints: number;
  badges: string[];
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');
  if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });

  const data = readJson<Record<string, UserData>>(paths.POINTS_FILE, {});
  const today = new Date().toISOString().slice(0, 10);
  const user = data[address.toLowerCase()] || { date: today, freeUsed: 0, purchased: 0, totalPoints: 0, badges: [] };

  if (user.date !== today) {
    user.date = today;
    user.freeUsed = 0;
  }

  const remainingFree = Math.max(0, 12 - user.freeUsed);
  const totalRemaining = remainingFree + user.purchased;

  return NextResponse.json({
    remainingFree,
    purchased: user.purchased,
    totalRemaining,
    totalPoints: user.totalPoints,
    badges: user.badges,
    date: today,
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { address, action, amount } = body;
  if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });

  const data = readJson<Record<string, UserData>>(paths.POINTS_FILE, {});
  const key = address.toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  const user = data[key] || { date: today, freeUsed: 0, purchased: 0, totalPoints: 0, badges: [] };

  if (user.date !== today) {
    user.date = today;
    user.freeUsed = 0;
  }

  if (action === 'buy') {
    const count = Number(amount) || 1;
    user.purchased += count;
    data[key] = user;
    writeJson(paths.POINTS_FILE, data);
    return NextResponse.json({ success: true, purchased: user.purchased });
  }

  if (action === 'use') {
    if (user.freeUsed < 12) {
      user.freeUsed += 1;
    } else if (user.purchased > 0) {
      user.purchased -= 1;
    } else {
      return NextResponse.json({ error: 'No bets remaining' }, { status: 400 });
    }
    data[key] = user;
    writeJson(paths.POINTS_FILE, data);
    return NextResponse.json({ success: true });
  }

  if (action === 'addPoints') {
    user.totalPoints += Number(amount) || 0;
    // Check badges
    const milestones = [
      { id: 'newbie', threshold: 100, name: 'Newbie' },
      { id: 'apprentice', threshold: 300, name: 'Apprentice' },
      { id: 'veteran', threshold: 500, name: 'Veteran' },
      { id: 'legendary', threshold: 1000, name: 'Legendary' },
    ];
    for (const m of milestones) {
      if (user.totalPoints >= m.threshold && !user.badges.includes(m.id)) {
        user.badges.push(m.id);
      }
    }
    data[key] = user;
    writeJson(paths.POINTS_FILE, data);
    return NextResponse.json({ success: true, totalPoints: user.totalPoints, badges: user.badges });
  }

  return NextResponse.json({ error: 'invalid action' }, { status: 400 });
}
