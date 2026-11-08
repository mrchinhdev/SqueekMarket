import { supabase } from './supabase';

export type Market = {
  id: string;
  question: string;
  type: string;
  status: 'open' | 'resolved';
  resolve_at: string;
  outcome?: 'yes' | 'no' | null;
  yes_price: number;
  volume: number;
  created_at: string;
  day: string;
  hour: number;
  resolve_condition: any;
};

export type Bet = {
  id: string;
  market_id: string;
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
  free_used: number;
  purchased: number;
  total_points: number;
  badges: string[];
};

export async function getMarkets(): Promise<Market[]> {
  const { data, error } = await supabase.from('markets').select('*').order('created_at', { ascending: false });
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

export async function getUser(address: string): Promise<UserData | null> {
  const { data, error } = await supabase.from('users').select('*').eq('address', address.toLowerCase()).single();
  if (error && error.code !== 'PGRST116') console.error('getUser', error);
  return data || null;
}

export async function upsertUser(user: UserData) {
  const { error } = await supabase.from('users').upsert({ ...user, address: user.address.toLowerCase() }, { onConflict: 'address' });
  if (error) console.error('upsertUser', error);
}

export async function getBetCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('bets').select('market_id');
  if (error || !data) return {};
  const counts: Record<string, number> = {};
  for (const row of data) {
    const id = row.market_id;
    counts[id] = (counts[id] || 0) + 1;
  }
  return counts;
}
