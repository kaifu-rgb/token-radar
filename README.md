# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/kaifu-rgb/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/kaifu-rgb/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar. It reads a sealed DefiLlama snapshot of the protocol universe, finds every protocol that still records no token of its own (excluding wrapped, staked, bridged and exchange products of tokens that already trade), and ranks them by what their launch would be worth. The implied value is peer-calibrated: each category's base multiple is the median market-cap-to-TVL ratio of that category's already-listed protocols in the same snapshot, shrunk toward the global median, then adjusted for 7-day TVL growth and protocol maturity. Every row carries a concrete, category-aware farm plan with costs and times. The program writes a static dashboard (the ranked board, a detail view per protocol, and filters), board.json and dossier.json — deterministically, with no network.

## Run it

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts --input /path/to/snapshot.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=vnkkh4nr&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
