'use strict';
const data = window.RADAR;
const root = document.getElementById('board');
const escapeText = value => String(value ?? '—').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => '$' + (n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : Math.round(n).toLocaleString());
const pct = n => n === null ? '—' : (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
const change = n => '<span class="' + (n >= 0 ? 'positive' : 'negative') + '">' + pct(n) + '</span>';
const metric = (value, label) => '<div class="metric"><strong>' + escapeText(value) + '</strong><span>' + label + '</span></div>';
const options = values => values.map(v => '<option value="' + escapeText(v) + '">' + escapeText(v) + '</option>').join('');
function modelPanel() {
  return '<section id="model"><div class="eyebrow">02 / Calibration desk</div><h2>A transparent estimate of launch scale.</h2><p>TVL multiplied by a calibrated peer valuation, recent growth and protocol maturity. Category medians are blended with four global peers to soften small samples. This is a comparative estimate, not a price forecast.</p><div class="formula">TVL × peer multiple × growth × maturity</div><p>Multiple clamp: 0.02–3 · Growth clamp: −60% to +120%, with 0.5 weight · Maturity: 0.6 + min(age, 1095) / 1095 × 0.4 · Unknown age: 365 days · Version: ' + escapeText(data.model.model_version) + '</p><div class="table-wrap"><table><thead><tr><th>Category</th><th>Listed peers</th><th>Median</th><th>Multiple used</th></tr></thead><tbody>' + data.peers.map(p => '<tr><td>' + escapeText(p.category) + '</td><td>' + p.peer_count + '</td><td>' + (p.category_median === null ? '—' : p.category_median.toFixed(3) + '×') + '</td><td class="value">' + p.multiple.toFixed(3) + '×</td></tr>').join('') + '</tbody></table></div></section>';
}
function livePanel() {
  return '<section><div class="eyebrow">03 / Public markets</div><h2>Already trading</h2><p>Top listed protocols by market cap. These tokens are not ranked in the launch radar.</p><div class="table-wrap"><table><thead><tr><th>Protocol</th><th>Market cap</th><th>TVL</th><th>7d</th></tr></thead><tbody>' + data.live.map(p => '<tr><td>' + escapeText(p.name) + '<small>' + escapeText(p.category) + ' · ' + escapeText(p.chains.join(', ')) + '</small></td><td>' + money(p.mcap_usd) + '</td><td>' + money(p.tvl_usd) + '</td><td>' + change(p.change_7d) + '</td></tr>').join('') + '</tbody></table></div></section>';
}
function board(params) {
  root.innerHTML = '<header><div><div class="eyebrow">01 / Pre-token opportunity monitor</div><h1>Find the next signal.</h1><p>Launch potential, measured against the market.</p></div><div class="metrics">' + metric(data.counts.protocols_scanned.toLocaleString(), 'Protocols scanned') + metric(data.counts.watchlist_size, 'Watchlist covered') + metric(data.rows.length, 'Board rows') + '</div></header><p class="method">Ranked by implied launch value: locked capital × listed-peer multiple × growth × maturity. Every eligible pre-token protocol is included. Snapshot <b>' + escapeText(data.as_of) + '</b> · ' + escapeText(data.source) + ' · Snapshot floor ' + money(data.floor_usd) + '.</p><div class="controls"><input id="search" type="search" aria-label="Search protocols" placeholder="Search protocols…"><select id="category" aria-label="Category"><option value="">All categories</option>' + options([...new Set(data.rows.map(p => p.category ?? 'Uncategorised'))].sort()) + '</select><select id="chain" aria-label="Chain"><option value="">All chains</option>' + options([...new Set(data.rows.flatMap(p => p.chains))].sort()) + '</select><select id="minimum" aria-label="Minimum TVL"><option value="0">Any TVL</option><option value="50000000">$50M+ TVL</option><option value="100000000">$100M+ TVL</option><option value="500000000">$500M+ TVL</option><option value="1000000000">$1B+ TVL</option></select><select id="sort" aria-label="Sort"><option value="implied_value_usd">Implied value</option><option value="tvl_usd">TVL</option><option value="change_7d">7d growth</option><option value="age_days">Age</option></select><label><input id="watch" type="checkbox">Watchlist only</label></div><div class="section-line"><span id="result-count"></span><span>ESTIMATED LAUNCH VALUE / USD</span></div><div class="table-wrap"><table><thead><tr><th>Rank</th><th>Protocol / sector</th><th>Chains</th><th>TVL</th><th>7d change</th><th>Peer multiple</th><th>Implied value ↓</th><th>Plan</th></tr></thead><tbody id="rows"></tbody></table></div><div class="panels"><div>' + modelPanel() + '</div><div>' + livePanel() + '</div></div>';
  const controls = Object.fromEntries(['search','category','chain','minimum','sort','watch'].map(id => [id, document.getElementById(id)]));
  controls.search.value = params.get('q') ?? '';
  controls.category.value = params.get('cat') ?? '';
  function refresh() {
    const query = controls.search.value.toLowerCase();
    const rows = data.rows.filter(p => (p.name + ' ' + p.slug).toLowerCase().includes(query) && (!controls.category.value || (p.category ?? 'Uncategorised') === controls.category.value) && (!controls.chain.value || p.chains.includes(controls.chain.value)) && p.tvl_usd >= Number(controls.minimum.value) && (!controls.watch.checked || data.watchlist.includes(p.slug))).sort((a,b) => (b[controls.sort.value] ?? -Infinity) - (a[controls.sort.value] ?? -Infinity) || a.rank - b.rank);
    document.getElementById('result-count').textContent = rows.length + ' signals / ' + data.rows.length + ' total';
    document.getElementById('rows').innerHTML = rows.map(p => '<tr tabindex="0" data-slug="' + escapeText(p.slug) + '"><td class="rank">' + String(p.rank).padStart(2,'0') + '</td><td><a href="#/p/' + encodeURIComponent(p.slug) + '">' + escapeText(p.name) + '</a><small>' + escapeText(p.category ?? 'Uncategorised') + (data.watchlist.includes(p.slug) ? ' · WATCHLIST' : '') + '</small></td><td><span class="pill">' + escapeText(p.chains.slice(0,2).join(' · ') || 'Unspecified') + '</span>' + (p.chains.length > 2 ? ' +' + (p.chains.length - 2) : '') + '</td><td>' + money(p.tvl_usd) + '</td><td>' + change(p.change_7d) + '</td><td>' + p.peer_multiple.toFixed(2) + '×<small>' + p.peer_count + ' listed peers</small></td><td class="value">' + money(p.implied_value_usd) + '</td><td><span class="pill">' + p.farm_steps.length + ' steps ↗</span></td></tr>').join('') || '<tr><td colspan="8" class="empty">No signals match these filters.</td></tr>';
    document.querySelectorAll('[data-slug]').forEach(row => {
      const open = () => { location.hash = '/p/' + encodeURIComponent(row.dataset.slug); };
      row.addEventListener('click', open);
      row.addEventListener('keydown', event => { if(event.key === 'Enter') open(); });
    });
  }
  Object.values(controls).forEach(el => el.addEventListener('input', refresh));
  refresh();
}
function detail(slug) {
  const p = data.rows.find(p => p.slug === slug);
  if (!p) { root.innerHTML = '<a class="back" href="#/board">← Back to radar</a><h1>Signal not found.</h1>'; return; }
  const peer = data.peers.find(c => c.category === (p.category ?? 'Uncategorised'));
  root.innerHTML = '<a class="back" href="#/board">← Back to radar</a><header><div><div class="eyebrow">Signal ' + String(p.rank).padStart(2,'0') + ' / Pre-token</div><h1>' + escapeText(p.name) + '</h1><p>' + escapeText(p.category ?? 'Uncategorised') + ' · ' + escapeText(p.chains.join(' / ')) + '</p></div>' + metric(money(p.implied_value_usd), 'Implied launch value') + '</header><div class="detail-stats">' + metric(money(p.tvl_usd),'Total value locked') + metric(pct(p.change_7d),'7d TVL change') + metric(p.age_days === null ? 'Unknown' : p.age_days + 'd','Protocol age') + metric(p.peer_count,'Listed peers') + '</div><div class="eyebrow">The valuation bridge</div><h2>Every multiplier, in the open.</h2><div class="formula">' + money(p.tvl_usd) + ' × ' + p.peer_multiple.toFixed(6) + ' × ' + p.growth_multiplier.toFixed(4) + ' × ' + p.maturity_multiplier.toFixed(4) + ' = ' + money(p.implied_value_usd) + '</div><p>Peer multiple: category median ' + (peer.category_median === null ? 'unavailable' : peer.category_median.toFixed(6) + '×') + ' from ' + p.peer_count + ' listed peers, shrunk toward the global median of ' + data.global_median.toFixed(6) + '× with weight 4. Null categories use the global median. Growth uses half of the clamped 7d change; maturity ranges from 0.6 to 1 over 1,095 days. Displayed factors are rounded; the estimate uses full precision.</p><h2>Your seven-step field plan</h2><p>Illustrative activity plan. Assess contract risk, fees and eligibility before allocating capital.</p><ol class="plan">' + p.farm_steps.map(step => '<li>' + escapeText(step) + '</li>').join('') + '</ol>';
}
function route() {
  const hash = location.hash.slice(1) || '/board';
  if (hash.startsWith('/p/')) detail(decodeURIComponent(hash.slice(3)));
  else {
    board(new URLSearchParams(hash.split('?')[1] ?? ''));
    if (hash === '/model') document.getElementById('model').scrollIntoView();
  }
}
if (data) { window.addEventListener('hashchange', route); route(); }
else root.innerHTML = '<h1>Snapshot unavailable</h1><p>Run the packager to load the sealed dataset.</p>';
