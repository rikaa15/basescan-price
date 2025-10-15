


import "dotenv/config";
import axios from "axios";
import { keccak256, toUtf8Bytes, Interface, JsonRpcProvider } from "ethers";
import * as fs from "fs";
import * as path from "path";

const API = "https://api.basescan.org/api";
const API_KEY = process.env.BASESCAN_API_KEY || "";
const RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";
const provider = new JsonRpcProvider(RPC_URL);

const POOL = "0x4e962BB3889Bf030368F56810A9c96B83CB3E778"; // cbBTC/USDC pool

const MINT_TXS = [
  
];

const BURN_TXS = [

];
const WRITE_CSV = true;

const TOKEN0_DECIMALS = 6; // USDC
const TOKEN1_DECIMALS = 8; // cbBTC

// Swap topics for common AMMs
// Uniswap V3: Swap(address,address,int256,int256,uint160,uint128,int24)
const SWAP_V3_SIG = "Swap(address,address,int256,int256,uint160,uint128,int24)";
const TOPIC0_V3 = keccak256(toUtf8Bytes(SWAP_V3_SIG));
// Uniswap V2/Solidly-style: Swap(address,uint256,uint256,uint256,uint256,address)
const SWAP_V2_SIG = "Swap(address,uint256,uint256,uint256,uint256,address)";
const TOPIC0_V2 = keccak256(toUtf8Bytes(SWAP_V2_SIG));
// Uniswap V3 Mint/Burn events for pivoting within a block
const MINT_V3_SIG = "Mint(address,address,int24,int24,uint128,uint256,uint256)";
const BURN_V3_SIG = "Burn(address,int24,int24,uint128,uint256,uint256)";
const TOPIC0_V3_MINT = keccak256(toUtf8Bytes(MINT_V3_SIG));
const TOPIC0_V3_BURN = keccak256(toUtf8Bytes(BURN_V3_SIG));

// Q96
const Q96 = 2n ** 96n;

// helpers
function priceToken1PerToken0_fromSqrtPriceX96(sqrtPriceX96: bigint): number {
  // (sqrtP / 2^96)^2
  const num = Number(sqrtPriceX96) / Number(Q96);
  return num * num;
}
function adjustForDecimals(raw: number, dec0: number, dec1: number) {
  return raw * Math.pow(10, dec0 - dec1);
}
function parseSqrtPriceX96FromData(hexData: string): bigint {
  // data packs non-indexed args in 32-byte slots:
  // amount0, amount1, sqrtPriceX96, liquidity, tick
  // sqrtPriceX96 is the 3rd slot (0-indexed: 2)
  const clean = hexData.startsWith("0x") ? hexData.slice(2) : hexData;
  const SLOT_BYTES = 64;
  const slot2 = clean.slice(2 * SLOT_BYTES, 3 * SLOT_BYTES);
  return BigInt("0x" + slot2);
}
function toISO(tsSec: number) {
  return new Date(tsSec * 1000).toISOString();
}

async function getLogsRange(fromBlock: number, toBlock: number) {
  // Filter for either V2 or V3 Swap events
  const logs = await provider.getLogs({
    address: POOL,
    fromBlock,
    toBlock,
    topics: [[TOPIC0_V2, TOPIC0_V3]],
  });
  return logs;
}

async function getPivotIndexInBlock(block: number, type: "mint" | "burn"): Promise<number | undefined> {
  const topic = type === "mint" ? TOPIC0_V3_MINT : TOPIC0_V3_BURN;
  const logs = await provider.getLogs({ address: POOL, fromBlock: block, toBlock: block, topics: [topic] });
  if (!logs.length) return undefined;
  // Choose the earliest occurrence by index to define the pivot within the block
  logs.sort((a: any, b: any) => Number(a.index ?? 0) - Number(b.index ?? 0));
  return Number((logs[0] as any).index ?? 0);
}

async function getPivotFromTx(txHash: string, type: "mint" | "burn"): Promise<{ block: number; index: number } | null> {
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) return null;
  const topic = type === "mint" ? TOPIC0_V3_MINT : TOPIC0_V3_BURN;
  let pivotIndex: number | undefined;
  for (const log of receipt.logs as any[]) {
    const addr = (log.address || "").toLowerCase();
    const t0 = log.topics?.[0];
    if (addr === POOL.toLowerCase() && t0 === topic) {
      const idx = Number((log as any).index ?? 0);
      pivotIndex = typeof pivotIndex === "number" ? Math.min(pivotIndex, idx) : idx;
    }
  }
  if (typeof pivotIndex !== "number") return null;
  return { block: Number(receipt.blockNumber), index: pivotIndex };
}

async function getReservesAtBlock(blockNumber: number) {
  const iface = new Interface([
    "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  ]);
  const data = iface.encodeFunctionData("getReserves", []);
  const raw = await provider.call({ to: POOL, data, blockTag: blockNumber });
  const decoded = iface.decodeFunctionResult("getReserves", raw);
  const reserve0 = BigInt(decoded[0].toString());
  const reserve1 = BigInt(decoded[1].toString());
  return { reserve0, reserve1 };
}

async function getLatestSwapAtOrBeforeBlock(block: number, maxIndexForSameBlock?: number) {
  console.log(`Querying block ${block}...`);
  const stepSizes = [0, 500, 2_000, 10_000, 50_000];
  for (const step of stepSizes) {
    const from = Math.max(0, block - step);
    const logs = await getLogsRange(from, block);
    let swaps = logs.filter((l) => l.topics?.[0] && (l.topics[0] === TOPIC0_V2 || l.topics[0] === TOPIC0_V3));
    if (typeof maxIndexForSameBlock === "number") {
      swaps = swaps.filter((l: any) => Number(l.blockNumber) < block || (Number(l.blockNumber) === block && Number((l as any).index ?? 0) < maxIndexForSameBlock));
    }
    if (swaps.length) {
      // latest at or before
      swaps.sort((a: any, b: any) => Number(b.blockNumber) - Number(a.blockNumber) || Number(b.index ?? 0) - Number(a.index ?? 0));
      return swaps[0];
    }
  }
  return null;
}

async function getEarliestSwapAtOrAfterBlock(block: number, minIndexForSameBlock?: number) {
  console.log(`Querying block ${block} (after)...`);
  const stepSizes = [0, 500, 2_000, 10_000, 50_000];
  for (const step of stepSizes) {
    const to = block + step;
    const logs = await getLogsRange(block, to);
    let swaps = logs.filter((l) => l.topics?.[0] && (l.topics[0] === TOPIC0_V2 || l.topics[0] === TOPIC0_V3));
    if (typeof minIndexForSameBlock === "number") {
      swaps = swaps.filter((l: any) => Number(l.blockNumber) > block || (Number(l.blockNumber) === block && Number((l as any).index ?? 0) > minIndexForSameBlock));
    }
    if (swaps.length) {
      swaps.sort((a: any, b: any) => Number(a.blockNumber) - Number(b.blockNumber) || Number(a.index ?? 0) - Number(b.index ?? 0));
      return swaps[0];
    }
  }
  return null;
}


(async () => {
  const rows: Array<{ block: number; closestBlock: number; blockIndex: number; side: "mint" | "burn"; ts: string; tx: string; price: number }> = [];

  // Mint txs: pick latest swap at-or-before pivot (strictly before within the same block)
  for (const tx of MINT_TXS) {
    try {
      const pivot = await getPivotFromTx(tx, "mint");
      if (!pivot) {
        console.log(`Mint pivot not found in tx ${tx}`);
        continue;
      }
      const pre = await getLatestSwapAtOrBeforeBlock(pivot.block, pivot.index);
      if (!pre) {
        console.log(`Tx ${tx}: no Swap found before`);
        continue;
      }
      const chosen = pre;
      const chosenBlockNum = Number(chosen.blockNumber);
      const sqrtPriceX96 = parseSqrtPriceX96FromData(chosen!.data);
      const rawRatio = priceToken1PerToken0_fromSqrtPriceX96(sqrtPriceX96);
      const token1PerToken0 = adjustForDecimals(rawRatio, TOKEN0_DECIMALS, TOKEN1_DECIMALS);
      const usdcPerCbBtc = 1 / token1PerToken0;
      const chosenTs = await provider.getBlock(chosenBlockNum);
      const ts = Number(chosenTs?.timestamp ?? 0);
      const iso = toISO(ts);
      console.log(`Mint tx ${tx} → closest swap before @ ${chosenBlockNum} (${iso})`);
      const logIndex = Number((chosen as any).index ?? (chosen as any).logIndex ?? 0);
      rows.push({ block: pivot.block, closestBlock: chosenBlockNum, blockIndex: logIndex, side: "mint", ts: iso, tx: chosen!.transactionHash, price: usdcPerCbBtc });
    } catch (e: any) {
      console.error(`Mint tx ${tx} error:`, e?.message || e);
    }
  }

  // Burn txs: pick earliest swap at-or-after pivot (strictly after within the same block)
  for (const tx of BURN_TXS) {
    try {
      const pivot = await getPivotFromTx(tx, "burn");
      if (!pivot) {
        console.log(`Burn pivot not found in tx ${tx}`);
        continue;
      }
      const post = await getEarliestSwapAtOrAfterBlock(pivot.block, pivot.index);
      if (!post) {
        console.log(`Tx ${tx}: no Swap found after`);
        continue;
      }
      const chosen = post;
      const chosenBlockNum = Number(chosen.blockNumber);
      const sqrtPriceX96 = parseSqrtPriceX96FromData(chosen!.data);
      const rawRatio = priceToken1PerToken0_fromSqrtPriceX96(sqrtPriceX96);
      const token1PerToken0 = adjustForDecimals(rawRatio, TOKEN0_DECIMALS, TOKEN1_DECIMALS);
      const usdcPerCbBtc = 1 / token1PerToken0;
      const chosenTs = await provider.getBlock(chosenBlockNum);
      const ts = Number(chosenTs?.timestamp ?? 0);
      const iso = toISO(ts);
      console.log(`Burn tx ${tx} → closest swap after @ ${chosenBlockNum} (${iso})`);
      const logIndex = Number((chosen as any).index ?? (chosen as any).logIndex ?? 0);
      rows.push({ block: pivot.block, closestBlock: chosenBlockNum, blockIndex: logIndex, side: "burn", ts: iso, tx: chosen!.transactionHash, price: usdcPerCbBtc });
    } catch (e: any) {
      console.error(`Burn tx ${tx} error:`, e?.message || e);
    }
  }

  if (WRITE_CSV) {
    if (!rows.length) {
      console.log("No rows to write; skipping CSV output.");
      return;
    }
    const header = "block,closest_block,block_index,side,timestamp,tx_hash,price_usdc_per_cbbtc\n";
    const csv =
      header +
      rows.map((r) => `${r.block},${r.closestBlock},${r.blockIndex},${r.side},${r.ts},${r.tx},${r.price}`).join("\n");

    const blocks = rows.map((r) => r.closestBlock);
    const startBlock = Math.min(...blocks);
    const lastBlock = Math.max(...blocks);
    const outName = `prices_basescan_${startBlock}_${lastBlock}.csv`;

    const outDir = path.resolve("output");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, outName);
    fs.writeFileSync(outPath, csv, "utf8");
    console.log(`\nWrote ${outPath} (${rows.length} rows)`);
  }
})();
