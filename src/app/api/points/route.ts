import { NextResponse } from 'next/server';
import { getUser, upsertUser, UserData } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');
  if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  let user = await getUser(address);

  if (!user || user.date !== today) {
    user = {
      address: address.toLowerCase(),
      date: today,
      freeUsed: 0,
      purchased: user?.purchased || 0,
      totalPoints: user?.totalPoints || 0,
      badges: user?.badges || [],
    };
    await upsertUser(user);
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

  const today = new Date().toISOString().slice(0, 10);
  let user = await getUser(address);

  if (!user || user.date !== today) {
    user = {
      address: address.toLowerCase(),
      date: today,
      freeUsed: 0,
      purchased: user?.purchased || 0,
      totalPoints: user?.totalPoints || 0,
      badges: user?.badges || [],
    };
  }

  if (action === 'buy') {
    const count = Number(amount) || 1;
    user.purchased += count;
    await upsertUser(user);
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
    await upsertUser(user);
    return NextResponse.json({ success: true });
  }

  if (action === 'addPoints') {
    user.totalPoints += Number(amount) || 0;
    const milestones = [
      { id: 'newbie', threshold: 100 },
      { id: 'apprentice', threshold: 300 },
      { id: 'veteran', threshold: 500 },
      { id: 'legendary', threshold: 1000 },
    ];
    for (const m of milestones) {
      if (user.totalPoints >= m.threshold && !user.badges.includes(m.id)) {
        user.badges.push(m.id);
      }
    }
    await upsertUser(user);
    return NextResponse.json({ success: true, totalPoints: user.totalPoints, badges: user.badges });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
