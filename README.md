## BaseScan Price Extractor (cbBTC/USDC)

Generates a CSV of cbBTC prices at the nearest Swap events around provided Mint and Burn transactions, using Base RPC logs. Outputs to `output/prices_basescan_{startBlock}_{lastBlock}.csv`.

### Prerequisites
- Node 18+
- npm

### Install
```bash
npm ci
```

### Configure
Create `.env` in project root:

Add  `BASE_RPC_URL` and `BASESCAN_API_KEY` (as in .env.example)


### Provide inputs (Mint/Burn TX arrays)
Edit `get_price_basescan.ts` and modify the arrays near the top:
```ts
const MINT_TXS = [
  "0x...",
  // add more mint tx hashes
];

const BURN_TXS = [
  "0x...",
  // add more burn tx hashes
];
```
- Mint TXs: script finds the latest Swap strictly before each Mint within the same block (or earlier blocks).
- Burn TXs: script finds the earliest Swap strictly after each Burn within the same block (or later blocks).

### Run
```bash
npm run start
```

### Output
- File path: `output/prices_basescan_{startBlock}_{lastBlock}.csv`
- Columns:
  - `block`: pivot (mint/burn) block number
  - `closest_block`: chosen swap block number
  - `block_index`: chosen swap log index within the block
  - `side`: `mint` (before) or `burn` (after)
  - `timestamp`: ISO8601 of chosen swap block timestamp
  - `tx_hash`: chosen swap transaction hash
  - `price_usdc_per_cbbtc`: price derived from sqrtPriceX96




