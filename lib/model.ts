import { farmSteps, stepText } from './farm.ts';
export type Protocol = {
  slug: string; name: string; category: string | null; chains: string[];
  tvl_usd: number; change_7d: number | null; mcap_usd: number | null;
  listed_at: string | null; gecko_id: string | null; symbol: string | null;
};
export type Snapshot = { as_of: string; source: string; floor_usd: number; watchlist: string[]; protocols: Protocol[] };
export const constants = { prior_weight: 4, multiple_min: 0.02, multiple_max: 3, growth_min: -60, growth_max: 120, growth_weight: 0.5, maturity_base: 0.6, maturity_days: 1095, default_age_days: 365 };
export function parseSnapshot(text: string): Snapshot {
  const parsed = JSON.parse(text);
  const s = typeof parsed.snapshot === 'object' && parsed.snapshot !== null ? { ...parsed, ...parsed.snapshot } : parsed;
  if (!s || !Array.isArray(s.protocols) || !Array.isArray(s.watchlist) || !/^\d{4}-\d{2}-\d{2}$/.test(s.as_of)) throw new Error('Invalid sealed snapshot');
  for (const p of s.protocols) {
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || !Array.isArray(p.chains) || !Number.isFinite(p.tvl_usd)) throw new Error('Invalid protocol record');
  }
  return s;
}
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const rounded = (n: number, digits: number) => Number(n.toFixed(digits));
export const preToken = (p: Protocol) => p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
function median(values: number[]): number {
  if (!values.length) return 1;
  const a = [...values].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}
export function calibration(s: Snapshot) {
  const peers = s.protocols.filter(p => !preToken(p) && p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0);
  const global = median(peers.map(p => p.mcap_usd! / p.tvl_usd));
  const categories = [...new Set(s.protocols.map(p => p.category))];
  const entries = categories.map(category => {
    const values = peers.filter(p => p.category === category).map(p => p.mcap_usd! / p.tvl_usd);
    const categoryMedian = values.length ? median(values) : null;
    const multiple = clamp(category === null || !values.length ? global : (values.length * categoryMedian! + 4 * global) / (values.length + 4), 0.02, 3);
    return { category, peer_count: values.length, category_median: categoryMedian, multiple };
  });
  return { global, entries };
}
export function implied(p: Protocol, s: Snapshot, peers: ReturnType<typeof calibration>) {
  const c = peers.entries.find(c => c.category === p.category)!;
  const age = p.listed_at === null ? null : Math.max(0, Math.floor((Date.parse(s.as_of) - Date.parse(p.listed_at)) / 86400000));
  const growth = clamp(p.change_7d ?? 0, -60, 120);
  const gm = 1 + growth / 100 * 0.5;
  const mm = 0.6 + Math.min(age ?? 365, 1095) / 1095 * 0.4;
  return {
    age_days: age,
    implied_value_usd: Math.max(1, Math.round(p.tvl_usd * c.multiple * gm * mm)),
    model: { peer_multiple: rounded(c.multiple, 6), peer_count: c.peer_count, category_median: c.category_median, global_median: peers.global, growth_pct: growth, growth_multiplier: rounded(gm, 4), maturity_multiplier: rounded(mm, 4), age_days: age },
  };
}
export type BoardRow = Protocol & ReturnType<typeof implied> & { rank: number; token_status: 'pre-token'; farm_steps: string[] };
export type Board = { rows: BoardRow[] };
function rankable(p: Protocol): boolean {
  const excluded = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);
  return preToken(p) && !excluded.has(p.category ?? '')
    && !/\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/.test(p.name)
    && !/(^|[^a-zA-Z0-9_])(wrapped|staked|staking)([^a-zA-Z0-9_]|$)/i.test(p.name)
    && !/^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)/.test(p.name);
}
export function buildBoard(s: Snapshot): Board {
  const peers = calibration(s);
  const rows = s.protocols.filter(rankable).map(p => {
    const value = implied(p, s, peers);
    return { ...p, ...value, rank: 0, token_status: 'pre-token' as const, farm_steps: farmSteps(p, value.age_days).map(stepText) };
  });
  rows.sort((a, b) => b.implied_value_usd - a.implied_value_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  rows.forEach((row, index) => { row.rank = index + 1; });
  return { rows };
}
export function boardIssue(board: Board, s: Snapshot): string | null {
  const rows = board.rows;
  const slugs = new Set(rows.map(r => r.slug));
  if (s.watchlist.some(slug => !slugs.has(slug))) return 'incomplete watchlist coverage';
  if (slugs.size !== rows.length) return 'duplicate slugs';
  if (rows.length !== s.protocols.filter(rankable).length) return 'eligible rows missing';
  if (!rows.length || new Set(rows.map(r => r.implied_value_usd)).size < 2) return 'all implied values are equal';
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.rank !== i + 1) return 'ranks must be consecutive';
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return 'unsafe implied value';
    if (i && rows[i - 1].implied_value_usd < r.implied_value_usd) return 'values are not descending';
    if (r.farm_steps.length < 3 || r.farm_steps.length > 12 || r.farm_steps.some(t => t.length < 20 || t.length > 600)) return 'invalid farm plan';
  }
  return null;
}
export function radarData(board: Board, s: Snapshot) {
  const peers = calibration(s);
  const live = s.protocols.filter(p => !preToken(p) && p.category !== 'CEX' && p.mcap_usd !== null && p.mcap_usd > 0)
    .sort((a, b) => b.mcap_usd! - a.mcap_usd! || a.slug.localeCompare(b.slug)).slice(0, 24)
    .map(({ slug, name, category, chains, tvl_usd, mcap_usd, change_7d }) => ({ slug, name, category, chains, tvl_usd, mcap_usd, change_7d }));
  return {
    as_of: s.as_of, source: s.source, floor_usd: s.floor_usd, watchlist: s.watchlist,
    model: { ...constants, model_version: 'radar-2' }, global_median: peers.global,
    counts: { protocols_scanned: s.protocols.length, watchlist_size: s.watchlist.length, board_size: board.rows.length, live_size: live.length },
    peers: peers.entries.map(p => ({ ...p, category: p.category ?? 'Uncategorised' })).sort((a, b) => a.category.localeCompare(b.category)),
    rows: board.rows.map(r => ({
      rank: r.rank, slug: r.slug, name: r.name, category: r.category, chains: r.chains,
      tvl_usd: r.tvl_usd, change_7d: r.change_7d, age_days: r.age_days, implied_value_usd: r.implied_value_usd,
      peer_multiple: r.model.peer_multiple, peer_count: r.model.peer_count,
      growth_multiplier: r.model.growth_multiplier, maturity_multiplier: r.model.maturity_multiplier, farm_steps: r.farm_steps,
    })), live,
  };
}
export type RadarData = ReturnType<typeof radarData>;
export function dashboardScript(board: Board, s: Snapshot): string {
  return 'window.RADAR=' + JSON.stringify(radarData(board, s)) + ';';
}
