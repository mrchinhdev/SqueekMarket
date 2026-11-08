import { supabase } from './supabase';

export type Market = {
  id: string;
  question: string;
  type: string;
  status: 'open' | 'resolved';
  resolveAt: string;
  outcome?: 'yes' | 'no' | null;
  yesPrice: number;
  volume: number;
  createdAt: string;
  day: string;
  hour: number;
  resolveCondition: any;
};

export type Bet = {
  id: string;
  marketId: string;
  address: string;
  side: 'yes' | 'no';
  amount: number;
  currency: string;
  timestamp: string;
  resolved?: boolean;
  payout?: number;
};

export type UserData = {
  address: string;
  date: string;
  freeUsed: number;
  purchased: number;
  totalPoints: number;
  badges: string[];
};

// Markets
export async function getMarkets(): Promise<Market[]> {
  const { data, error } = await supabase.from('markets').select('*').order('createdAt', { ascending: false });
  if (error) {
    console.error('getMarkets', error);
    return [];
  }
  return data || [];
}

export async function upsertMarkets(markets: Market[]) {
  if (markets.length === 0) return;
  const { error } = await supabase.from('markets').upsert(markets, { onConflict: 'id' });
  if (error) console.error('upsertMarkets', error);
}

export async function updateMarket(id: string, updates: Partial<Market>) {
  const { error } = await supabase.from('markets').update(updates).eq('id', id);
  if (error) console.error('updateMarket', error);
}

// Bets
export async function getBets(address?: string): Promise<Bet[]> {
  let q = supabase.from('bets').select('*').order('timestamp', { ascending: false });
  if (address) q = q.eq('address', address.toLowerCase());
  const { data, error } = await q;
  if (error) {
    console.error('getBets', error);
    return [];
  }
  return data || [];
}

export async function insertBet(bet: Bet) {
  const { error } = await supabase.from('bets').insert(bet);
  if (error) console.error('insertBet', error);
  return !error;
}

export async function updateBet(id: string, updates: Partial<Bet>) {
  const { error } = await supabase.from('bets').update(updates).eq('id', id);
  if (error) console.error('updateBet', error);
}

// Points / Users
export async function getUser(address: string): Promise<UserData | null> {
  const { data, error } = await supabase.from('users').select('*').eq('address', address.toLowerCase()).single();
  if (error && error.code !== 'PGRST116') console.error('getUser', error);
  return data || null;
}

export async function upsertUser(user: UserData) {
  const { error } = await supabase.from('users').upsert({ ...user, address: user.address.toLowerCase() }, { onConflict: 'address' });
  if (error) console.error('upsertUser', error);
}
