'use client';

import { useAccount, useConnect, useDisconnect, useBalance, useWriteContract } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { formatUnits, parseUnits } from 'viem';
import { SQK_ADDRESS } from '@/lib/constants';

const RECEIVER_ADDRESS = '0xA91D3e7050e818941c12a2772A733C8EcDE71a46' as const;
const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;
import { useEffect, useState } from 'react';
import { Wallet, RefreshCw, Trophy, ChevronLeft, ChevronRight, X, Clock } from 'lucide-react';

type Market = {
  id: string;
  question: string;
  type: string;
  status: 'open' | 'resolved';
  resolveAt: string;
  outcome?: 'yes' | 'no';
  yesPrice: number;
  volume: number;
  createdAt?: string;
};

type Bet = {
  id: string;
  marketId: string;
  side: 'yes' | 'no';
  amount: number;
  currency: string;
  timestamp: string;
  resolved?: boolean;
  payout?: number;
};

type Leader = {
  rank: number;
  address: string;
  points: number;
  wins: number;
  bets: number;
};

type UserStats = {
  remainingFree: number;
  purchased: number;
  totalRemaining: number;
  totalPoints: number;
  badges: string[];
};

const BADGES = [
  { id: 'newbie', name: 'Newbie', threshold: 100, color: 'bg-zinc-600', img: '/hamsters/newbie.png' },
  { id: 'apprentice', name: 'Apprentice', threshold: 300, color: 'bg-blue-600', img: '/hamsters/apprentice.png' },
  { id: 'veteran', name: 'Veteran', threshold: 500, color: 'bg-purple-600', img: '/hamsters/veteran.png' },
  { id: 'legendary', name: 'Legendary', threshold: 1000, color: 'bg-amber-500', img: '/hamsters/legendary.png' },
];

export default function Home() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();

  const { data: sqkBalance, isLoading: balanceLoading, error: balanceError, isSuccess: balanceSuccess } = useBalance({
    address,
    token: SQK_ADDRESS,
    chainId: 11155111,
    query: { 
      enabled: !!address && isConnected, 
      refetchInterval: 15000,
      retry: 2,
      staleTime: 10000,
    },
  });

  const [markets, setMarkets] = useState<Market[]>([]);
  const [myBets, setMyBets] = useState<Bet[]>([]);
  const [stats, setStats] = useState<UserStats>({ remainingFree: 12, purchased: 0, totalRemaining: 12, totalPoints: 0, badges: [] });
  const [loading, setLoading] = useState(false);
  const [liveStats, setLiveStats] = useState<any>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  const [tab, setTab] = useState<'markets' | 'leaderboard' | 'bets' | 'badges'>('markets');
  const [leaderboard, setLeaderboard] = useState<Leader[]>([]);
  const [lbPage, setLbPage] = useState(1);
  const [betsPage, setBetsPage] = useState(1);
  const [marketsPage, setMarketsPage] = useState(1);
  const BETS_PER_PAGE = 10;
  const MARKETS_PER_PAGE = 10;
  const [lbTotalPages, setLbTotalPages] = useState(1);

  // Modals
  const [betModal, setBetModal] = useState<{ market: Market; side: 'yes' | 'no' } | null>(null);
  const [buyModal, setBuyModal] = useState(false);
  const [buyCount, setBuyCount] = useState(1);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [nextMarketIn, setNextMarketIn] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
      const diff = nextHour.getTime() - now.getTime();
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setNextMarketIn(`${m}m ${s}s`);
    };
    updateCountdown();
    const t = setInterval(updateCountdown, 1000);
    return () => clearInterval(t);
  }, []);

  async function loadData() {
    const [mRes, pRes] = await Promise.all([
      fetch('/api/markets'),
      address ? fetch(`/api/points?address=${address}`) : null,
    ]);
    setMarkets(await mRes.json());
    if (pRes) setStats(await pRes.json());

    if (address) {
      const bRes = await fetch(`/api/bets?address=${address}`);
      setMyBets(await bRes.json());
    }
  }

  async function loadLeaderboard(page = 1) {
    const res = await fetch(`/api/leaderboard?page=${page}`);
    const data = await res.json();
    setLeaderboard(data.data || []);
    setLbTotalPages(data.totalPages || 1);
    setLbPage(page);
  }

  async function loadLive() {
    try {
      const res = await fetch('https://api.squeekchain.com/v1/status');
      const data = await res.json();
      setLiveStats(data);
    } catch {}
  }

  useEffect(() => {
    loadData();
    loadLive();
    loadLeaderboard(1);
    const i = setInterval(() => { loadData(); loadLive(); }, 15000);
    return () => clearInterval(i);
  }, [address]);

  function showMessage(text: string, type: 'success' | 'error' = 'success') {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  }

  async function confirmBet() {
    if (!betModal || !address) return;
    setLoading(true);
    const res = await fetch('/api/bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketId: betModal.market.id, address, side: betModal.side }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) {
      showMessage(data.error, 'error');
    } else {
      showMessage(`Bet placed on ${betModal.side.toUpperCase()}!`);
      setBetModal(null);
      loadData();
    }
  }

  async function buyBets() {
    if (!address) return;
    const cost = buyCount * 10;
    if (sqkBalance && Number(formatUnits(sqkBalance.value, sqkBalance.decimals)) < cost) {
      showMessage('Not enough SQK', 'error');
      return;
    }
    setLoading(true);
    try {
      // Transfer SQK to receiver
      const amount = parseUnits(cost.toString(), sqkBalance?.decimals || 18);
      await writeContractAsync({
        address: SQK_ADDRESS,
        abi: ERC20_TRANSFER_ABI,
        functionName: 'transfer',
        args: [RECEIVER_ADDRESS, amount],
        chainId: 11155111,
      });

      // Record the purchase after successful transfer
      const res = await fetch('/api/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, action: 'buy', amount: buyCount }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage(`Bought ${buyCount} bet(s) for ${cost} SQK!`);
        setBuyModal(false);
        loadData();
      } else {
        showMessage(data.error || 'Failed to record purchase', 'error');
      }
    } catch (err: any) {
      showMessage(err?.shortMessage || err?.message || 'Transfer failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function triggerResolve() {
    setLoading(true);
    await fetch('/api/resolve', { method: 'POST' });
    setLoading(false);
    loadData();
    loadLeaderboard(lbPage);
    showMessage('Resolution check completed');
  }

  const height = liveStats?.builder?.anchor?.blockHeight || liveStats?.builder?.projected?.blockHeight || '—';
  const work = liveStats?.measurement?.cumulativeWorkUnits ? Number(liveStats.measurement.cumulativeWorkUnits).toLocaleString() : '—';

  function formatTimeLeft(iso: string) {
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return 'Ended';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m left`;
  }

  return (
    <div 
      className={`min-h-screen dot-background ${theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900'}`}
    >
      {/* Toast */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          message.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          {message.text}
        </div>
      )}

      {/* Bet Modal */}
      {betModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold">Confirm Bet</h3>
              <button onClick={() => setBetModal(null)}><X size={20} /></button>
            </div>
            <p className="text-sm text-zinc-300 mb-2">{betModal.market.question}</p>
            <p className="text-lg font-bold text-amber-400 mb-4">
              Side: {betModal.side.toUpperCase()}
            </p>
            <p className="text-xs text-zinc-500 mb-6">Uses 1 bet slot · Resolves: {formatTimeLeft(betModal.market.resolveAt)}</p>
            <div className="flex gap-3">
              <button onClick={() => setBetModal(null)} className="flex-1 py-2.5 bg-zinc-800 rounded-xl">Cancel</button>
              <button onClick={confirmBet} disabled={loading} className="flex-1 py-2.5 bg-amber-500 text-black font-semibold rounded-xl">
                {loading ? 'Placing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buy Modal */}
      {buyModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-6 max-w-sm w-full">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold">Buy Bet Slots</h3>
              <button onClick={() => setBuyModal(false)}><X size={20} /></button>
            </div>
            <p className="text-sm text-zinc-400 mb-4">10 $SQK = 1 bet slot</p>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setBuyCount(Math.max(1, buyCount - 1))} className="w-10 h-10 bg-zinc-800 rounded-lg">-</button>
              <span className="text-2xl font-bold w-12 text-center">{buyCount}</span>
              <button onClick={() => setBuyCount(buyCount + 1)} className="w-10 h-10 bg-zinc-800 rounded-lg">+</button>
            </div>
            <p className="text-center text-amber-400 font-medium mb-6">Cost: {buyCount * 10} $SQK</p>
            <div className="flex gap-3">
              <button onClick={() => setBuyModal(false)} className="flex-1 py-2.5 bg-zinc-800 rounded-xl">Cancel</button>
              <button onClick={buyBets} disabled={loading} className="flex-1 py-2.5 bg-amber-500 text-black font-semibold rounded-xl">
                {loading ? 'Buying...' : 'Buy'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 overflow-hidden">
              <img src="/hamsters/logo.png" alt="Squeek" className="w-10 h-10" style={{ imageRendering: 'pixelated' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Squeek Market</h1>
              <p className="text-sm text-amber-200/70">Bet on Squeektoshi · Hamster-powered predictions</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="px-3 py-2 bg-zinc-800/60 hover:bg-zinc-700 rounded-xl text-sm border border-zinc-700"
              title="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {!mounted ? (
              <div className="px-4 py-2 bg-zinc-800/80 rounded-xl text-sm text-zinc-400">Connecting...</div>
            ) : isConnected ? (
              <div className="relative text-sm card-solid rounded-xl px-3 py-2 min-w-[180px]">
                <button 
                  onClick={() => disconnect()} 
                  className="absolute -top-2 -left-2 px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded text-[10px] leading-tight border border-zinc-600"
                  title="Disconnect"
                >
                  Disconnect
                </button>
                <div className="text-right pt-1">
                  <div className="font-mono text-amber-100 text-xs">{address?.slice(0, 6)}...{address?.slice(-4)}</div>
                  <div className="text-[11px] text-amber-200/70">
                    {chain?.name || 'Sepolia'}
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => connect({ connector: connectors.find(c => c.id === 'injected') || injected() })}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-black rounded-xl font-semibold hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/20"
              >
                <Wallet size={18} /> Connect MetaMask / OKX
              </button>
            )}
          </div>
        </header>

        {/* Live Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="card-solid rounded-2xl p-4">
            <div className="text-xs text-amber-200/50 uppercase tracking-wider">Block Height</div>
            <div className="text-2xl font-bold mt-1 text-amber-100">{height}</div>
          </div>
          <div className="card-solid rounded-2xl p-4">
            <div className="text-xs text-amber-200/50 uppercase tracking-wider">Settled Work</div>
            <div className="text-2xl font-bold mt-1 text-amber-100">{work}</div>
          </div>
          <div className="card-solid rounded-2xl p-4">
            <div className="text-xs text-amber-200/50 uppercase tracking-wider">Wheel</div>
            <div className="text-2xl font-bold mt-1 text-amber-100">{liveStats?.measurement?.coreStatus || '—'}</div>
          </div>
          <button
            onClick={triggerResolve}
            disabled={loading}
            className="card-solid rounded-2xl p-4 flex items-center justify-between hover:border-amber-500/50 transition"
          >
            <div className="text-left">
              <div className="text-xs text-amber-200/50 uppercase">Resolve</div>
              <div className="text-sm mt-1">Check settled</div>
            </div>
            <RefreshCw size={18} className={loading ? 'animate-spin text-amber-400' : 'text-amber-300'} />
          </button>
        </div>

        {/* User Info Box (grouped wallet details) */}
        {mounted && isConnected && (
          <div className="card-solid rounded-2xl p-5 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs text-amber-200/50 uppercase tracking-wider">Balance & Bets</div>
                <div className="text-lg font-semibold text-amber-400">
                  {sqkBalance && sqkBalance.value !== undefined
                    ? `${Number(formatUnits(sqkBalance.value, sqkBalance.decimals || 18)).toFixed(2)} $SQK`
                    : balanceLoading
                      ? 'Loading...'
                      : balanceError
                        ? 'Failed to load'
                        : '0.00 $SQK'}
                </div>
                <div className="text-sm text-amber-200/70">
                  Bets remaining: <span className="font-medium text-amber-300">{stats.totalRemaining}</span>
                  <span className="text-xs text-zinc-500 ml-1">({stats.remainingFree} free + {stats.purchased} bought)</span>
                </div>
              </div>
              <div>
                <button 
                  onClick={() => setBuyModal(true)} 
                  className="px-4 py-2.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl text-sm hover:bg-amber-500/30 font-medium"
                >
                  Buy Bets
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-zinc-800 pb-2 overflow-x-auto">
          {(['markets', 'leaderboard', 'bets', 'badges'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition ${
                tab === t 
                  ? 'bg-amber-500 text-black' 
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {t === 'markets' && 'Daily Markets'}
              {t === 'leaderboard' && <span className="flex items-center gap-1"><Trophy size={14} /> Leaderboard</span>}
              {t === 'bets' && 'My Bets'}
              {t === 'badges' && 'Badges'}
            </button>
          ))}
        </div>

        {/* Markets */}
        {tab === 'markets' && (
          <div>
            <div className="mb-4 flex items-center justify-between text-sm text-amber-200/70">
              <div className="flex items-center gap-2">
                <Clock size={14} /> Next market in: <span className="font-mono text-amber-300">{nextMarketIn}</span>
                <span className="text-zinc-500">· {markets.length} markets today</span>
              </div>
              {markets.length > MARKETS_PER_PAGE && (
                <div className="flex items-center gap-2">
                  <button 
                    disabled={marketsPage <= 1} 
                    onClick={() => setMarketsPage(p => Math.max(1, p - 1))} 
                    className="p-1 disabled:opacity-30"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-zinc-400">{marketsPage} / {Math.ceil(markets.length / MARKETS_PER_PAGE)}</span>
                  <button 
                    disabled={marketsPage >= Math.ceil(markets.length / MARKETS_PER_PAGE)} 
                    onClick={() => setMarketsPage(p => p + 1)} 
                    className="p-1 disabled:opacity-30"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
            {markets.length === 0 && <p className="text-zinc-500 col-span-2">Loading daily markets...</p>}
            {(() => {
              // Newest first (by id or created time if available; fallback to reverse order)
              const sorted = [...markets].sort((a, b) => {
                const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return tb - ta || b.id.localeCompare(a.id);
              });
              const start = (marketsPage - 1) * MARKETS_PER_PAGE;
              const paged = sorted.slice(start, start + MARKETS_PER_PAGE);
              return paged.map((m, idx) => (
              <div key={`${m.id}-${idx}`} className="card-solid rounded-2xl p-5 transition hover:border-amber-500/50">
                <div className="flex justify-between items-start gap-3 mb-2">
                  <h3 className="font-medium leading-snug">{m.question}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                    m.status === 'resolved' ? 'bg-emerald-900/50 text-emerald-300' : 'bg-amber-900/40 text-amber-300'
                  }`}>
                    {m.status === 'resolved' ? m.outcome?.toUpperCase() : 'Open'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-amber-200/60 mb-3">
                  <Clock size={12} /> {formatTimeLeft(m.resolveAt)}
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-emerald-400">Yes {(m.yesPrice * 100).toFixed(0)}%</span>
                  <span className="text-rose-400">No {((1 - m.yesPrice) * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full mb-4 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-amber-400" style={{ width: `${m.yesPrice * 100}%` }} />
                </div>
                <div className="text-xs text-zinc-500 mb-4">Volume: {m.volume} bets</div>

                {m.status === 'open' && mounted && isConnected && (() => {
                  const already = myBets.some(b => b.marketId === m.id);
                  return already ? (
                    <div className="text-center text-sm text-zinc-500 py-2">Already bet</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setBetModal({ market: m, side: 'yes' })}
                        className="py-2 text-sm bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 rounded-xl hover:bg-emerald-600/30"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setBetModal({ market: m, side: 'no' })}
                        className="py-2 text-sm bg-rose-600/20 border border-rose-500/30 text-rose-300 rounded-xl hover:bg-rose-600/30"
                      >
                        No
                      </button>
                    </div>
                  );
                })()}
              </div>
              ));
            })()}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {tab === 'leaderboard' && (
          <div className="card-solid rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2"><Trophy className="text-amber-400" size={18} /> Top Predictors</h2>
              <div className="flex items-center gap-2 text-sm">
                <button disabled={lbPage <= 1} onClick={() => loadLeaderboard(lbPage - 1)} className="p-1 disabled:opacity-30">
                  <ChevronLeft size={18} />
                </button>
                <span className="text-zinc-400">{lbPage} / {lbTotalPages}</span>
                <button disabled={lbPage >= lbTotalPages} onClick={() => loadLeaderboard(lbPage + 1)} className="p-1 disabled:opacity-30">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            <div className="divide-y divide-zinc-800">
              {leaderboard.length === 0 && <p className="p-6 text-zinc-500 text-sm">No rankings yet. Place some bets!</p>}
              {leaderboard.map(item => (
                <div key={item.address} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 text-center font-bold ${item.rank <= 3 ? 'text-amber-400' : 'text-zinc-500'}`}>
                      #{item.rank}
                    </span>
                    <span className="font-mono">{item.address.slice(0, 6)}...{item.address.slice(-4)}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-300 font-medium">{item.points} pts</div>
                    <div className="text-xs text-zinc-500">{item.wins} wins · {item.bets} bets</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Bets */}
        {tab === 'bets' && (
          <div>
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm text-amber-200/70">
              <div className="flex flex-wrap items-center gap-3">
                <span>Total: <span className="font-semibold text-amber-300">{myBets.length}</span></span>
                <span className="text-emerald-400">Correct: <span className="font-semibold">{myBets.filter(b => b.resolved && b.payout && b.payout > 0).length}</span></span>
                <span className="text-rose-400">Wrong: <span className="font-semibold">{myBets.filter(b => b.resolved && (!b.payout || b.payout === 0)).length}</span></span>
              </div>
              {myBets.length > BETS_PER_PAGE && (
                <div className="flex items-center gap-2">
                  <button 
                    disabled={betsPage <= 1} 
                    onClick={() => setBetsPage(p => Math.max(1, p - 1))} 
                    className="p-1 disabled:opacity-30"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-zinc-400">{betsPage} / {Math.ceil(myBets.length / BETS_PER_PAGE)}</span>
                  <button 
                    disabled={betsPage >= Math.ceil(myBets.length / BETS_PER_PAGE)} 
                    onClick={() => setBetsPage(p => p + 1)} 
                    className="p-1 disabled:opacity-30"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>
            {!isConnected && <p className="text-zinc-500 text-sm">Connect wallet to see your bets.</p>}
            {isConnected && myBets.length === 0 && <p className="text-zinc-500 text-sm">No bets yet today.</p>}
            <div className="space-y-2">
              {(() => {
                const sorted = [...myBets].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                const start = (betsPage - 1) * BETS_PER_PAGE;
                const paged = sorted.slice(start, start + BETS_PER_PAGE);
                return paged.map(b => {
                  const market = markets.find(m => m.id === b.marketId);
                  return (
                    <div key={b.id} className="flex items-center justify-between card-solid rounded-xl p-3 text-sm">
                      <div>
                        <div className="max-w-md truncate">{market?.question || b.marketId}</div>
                        <div className="text-xs text-zinc-500">{new Date(b.timestamp).toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <div className={b.side === 'yes' ? 'text-emerald-400' : 'text-rose-400'}>{b.side.toUpperCase()}</div>
                        {b.resolved && <div className="text-xs">{b.payout ? `Won` : 'Lost'}</div>}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* Badges */}
        {tab === 'badges' && (
          <div>
            <div className="mb-6 text-center">
              <div className="text-4xl font-bold text-amber-400">{stats.totalPoints}</div>
              <div className="text-sm text-zinc-400">Total Points</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {BADGES.map(b => {
                const unlocked = stats.badges.includes(b.id);
                return (
                  <div
                    key={b.id}
                    className={`relative rounded-2xl p-6 text-center border-2 transition ${
                      unlocked
                        ? `${b.color} border-transparent text-white`
                        : 'card-solid text-zinc-500'
                    }`}
                    style={{ imageRendering: 'pixelated' }}
                  >
                    <img src={b.img} alt={b.name} className="w-12 h-12 mx-auto mb-3" style={{ imageRendering: 'pixelated' }} />
                    <div className="font-bold text-sm uppercase tracking-wide">{b.name}</div>
                    <div className="text-xs mt-1 opacity-80">{b.threshold} pts</div>
                    {unlocked && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-xs">✓</div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-center text-xs text-zinc-500 mt-6">
              Earn points by winning bets. Badges unlock automatically at 100 / 300 / 500 / 1000 points.
            </p>
            <p className="text-center text-xs text-amber-200/60 mt-2">
              Points are updated every 24 hours at 00:00 UTC.
            </p>
          </div>
        )}

        <footer className="mt-16 text-center text-xs text-zinc-600">
          Squeek Market · Built for the hamster-powered internet · Data from api.squeekchain.com
        </footer>
      </div>
    </div>
  );
}
