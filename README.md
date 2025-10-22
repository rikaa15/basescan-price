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


### Provide inputs via CSV
Place `actions.csv` from timeline script as `input.csv` in the project root (or set `INPUT_CSV` in `.env`). Required columns:

```csv
timestamp,block_number,tx_index,tx_hash,action,log_index,token_id,tick_lower,tick_upper,liquidity,amount0,amount1,amount0_dec,amount1_dec,fee0,fee1,fee0_dec,fee1_dec,details
```

- Only `action` and `tx_hash` are used by the script; other columns are ignored.
- Supported `action` values and the price selection rule:
  - `mint`: latest swap strictly before (same-block swaps must have lower log index)
  - `burn`: earliest swap strictly after (same-block swaps must have higher log index)
  - `collect`: earliest swap strictly after
  - `gauge_deposit`: latest swap strictly before
  - `gauge_withdraw`: earliest swap strictly after
  - `gauge_getReward`: earliest swap strictly after

If `input.csv` is missing or doesn’t contain `action`/`tx_hash`, the script falls back to the arrays in `get_price_basescan.ts`.

### Run
```bash
npm run start
```

### Output
- File path: `output/prices_basescan_{startBlock}_{lastBlock}.csv`
- Columns:
  - `block`: pivot block number
  - `closest_block`: chosen swap block number
  - `block_index`: chosen swap log index within the block
  - `side`: one of `mint`, `burn`, `collect`, `gauge_deposit`, `gauge_withdraw`, `gauge_getReward`
  - `timestamp`: ISO8601 of chosen swap block timestamp
  - `tx_hash`: chosen swap transaction hash
  - `price_usdc_per_cbbtc`: price derived from sqrtPriceX96




