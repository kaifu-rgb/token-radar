type FarmProtocol = { category: string | null; chains: string[]; tvl_usd: number };
export type FarmStep = { text: string; cost: string; time: string };
export function stepText(step: FarmStep): string {
  const value = step.text + ' Cost: ' + step.cost + '. Time: ' + step.time + '.';
  return value.slice(0, 600).padEnd(20, ' ');
}
export function farmSteps(p: FarmProtocol, ageDays: number | null): FarmStep[] {
  const category = (p.category ?? '').toLowerCase();
  const chain = p.chains[0] ?? 'the primary chain';
  const second = p.chains[1] ?? chain;
  const capital = p.tvl_usd >= 5e9 ? 250 : p.tvl_usd >= 1e9 ? 150 : p.tvl_usd >= 1e8 ? 100 : 50;
  const actions: [RegExp, string, string][] = [
    [/lending|cdp|collateral/, 'supply USDC and open a small borrow capped at 10% of supplied collateral; verify the liquidation buffer', 'Supply a second supported asset or participate in a governance vote'],
    [/dexs/, 'provide liquidity to the main pool and stake the LP position', 'Swap a small weekly pair through the aggregator route'],
    [/cross chain bridge/, 'bridge USDC to a second chain through the protocol and use the funds there', 'Make a small return bridge transfer after using the destination funds'],
    [/derivatives|perpetual/, 'deposit margin and open one small hedged trade', 'Close and review the hedged position with a small limit order'],
    [/yield|aggregator|farm|leveraged/, 'deposit into the main vault or strategy', 'Add a small amount to a second supported strategy'],
    [/risk curator|allocator|capital/, 'deposit into a curated vault and keep the shares', 'Review the allocation and add to a second curated vault'],
    [/rwa/, 'mint or buy the yield asset and hold', 'Review the redemption process and make a second small purchase'],
    [/staking|restaking/, "stake the chain's asset and keep the receipt", 'Review the validator and delegate a second small amount'],
    [/launchpad/, 'take part in one launch allocation round', 'Review a second allocation round and its eligibility requirements'],
    [/synthetics/, 'mint a small synthetic position against collateral', 'Adjust collateral while keeping a conservative position'],
    [/options/, 'buy one small dated option', 'Review the expiry and close a small portion of the position'],
    [/indexes/, 'mint the index token', 'Review index weights and add a second small contribution'],
    [/basis/, 'deposit into the basis strategy', 'Review funding exposure and make a second small deposit'],
    [/chain/, 'bridge in and make the first transactions on the chain', 'Use a second native application with a small transaction'],
  ];
  const action = actions.find(([pattern]) => pattern.test(category));
  const hold = ageDays === null ? 30 : ageDays < 180 ? 60 : ageDays < 365 ? 45 : 30;
  return [
    { text: 'Create a fresh wallet, keep its seed offline, and transfer only the funds allocated to this farm on ' + chain + '.', cost: 'wallet setup plus gas', time: '15 minutes' },
    { text: 'On ' + chain + ', allocate about $' + capital + ' to ' + (action?.[1] ?? "deposit USDC into the protocol's main product") + '. Check product risks before signing.', cost: '$' + capital + ' capital plus gas', time: '20 minutes' },
    { text: 'On ' + second + ', ' + (action?.[2] ?? 'make a second deposit on a different day') + '. Confirm that this is eligible activity.', cost: 'small additional capital plus gas', time: '15 minutes on another day' },
    { text: 'Complete one qualifying transaction each week on ' + chain + '; review approvals and avoid unnecessary volume.', cost: 'small weekly gas budget', time: '10 minutes weekly' },
    { text: 'Hold the position for ' + hold + ' days so activity spans more than one snapshot; monitor liquidation and withdrawal conditions.', cost: 'capital remains exposed', time: hold + ' days' },
    { text: "Open the protocol's own points or rewards page. Claim only from links it publishes, and never pay to claim.", cost: 'no claim payment; gas only if needed', time: '5 minutes weekly' },
    { text: 'Keep a farm log with wallet, dates and transactions on ' + p.chains.join(', ') + '. Record the unwind path and test a small withdrawal before exiting.', cost: 'withdrawal gas and applicable fees', time: '15 minutes plus withdrawal delay' },
  ];
}
