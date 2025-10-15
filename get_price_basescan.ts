


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
  "0x302b346784141a86351ebe7a96bbebc726a3f4bf0a3e43e63aa0c170863efb2c",
  "0x50cba4d4133457404c19799e48723dbb61342ab8b0053fc7b01cd44ffeec3a28",
  "0x6d3d95202b4bfa804e6074bd53396ea4692ab175cff599684bac214c19502fb8",
  "0xce9e81be9049d53a868a857afc67ecd5a9c79959a14e0ab3c5d6c49e3b0db16e",
  "0x7a52e5b6f18987418baf267209751ba8df87fc6be7111040c60ee1a4892e5d7c",
  "0x2a638d71140b743d9d7c238fddcec2f72971d70f77dc10339acb6330f6d76924",
  "0x04afab06eb0d70ac34a3c203a0e35bc2d85a6977fa198a22cb04f5e665aaefab",
  "0x9a5f622846a0c4ffd0307416b7d1142eab55339eea56fb34fbb0adaac467168a",
  "0x6c05360f5ad1303ab5fa8c0402b29cb97b3756f72b2541f632d9dd488498d294",
  "0x160d1da3014ba1f80d455efc9641ddaeb204b81a61193a1058e3d6557268fbc8",
  "0x8e3a7e995af0df2fd6cd42ad2452dde94e0d853b2638819de5c1a0914e950387",
  "0xb3d2d5e7ca5fa3f641cd27c4883202fce45903959875cdbd7c28fef24c134c58",
  "0x8bda0b7bf25ec99d540eb32a1f7b8f72c585c9eed258f5204afb08d8113ce0ea",
  "0xf47f31b9802480ef35f5bf865bc367ad0a3e1b38f17f9575e12c48ff28548eba",
  "0x312d92dcd7b4e9d40b4be196d42635695a1e36b2700b06aac04f9cf104f94589",
  "0x4109ae40f1194a8750ada5f43b79475632a0fc6aa020ea97736444047df77fb8",
  "0x4e7f31e4f821413bd9a9a7e30ab1046ad35e92b7f15fae1ca063b8bd59e820b6",
  "0x51b4ec553f7bb9b266b023d39298f25d760601a34c14cbeb0d86210ac9488221",
  "0x558935848fb3fdbc12a605509ddccc14e9087af8d25722f0f2020b8c53fab107",
  "0x01c33095ba3bd90ff2faca3ce590b12f5bff288f0ccb92f2e479dca83fdba5c2",
  "0x306b9df235ec30799dad657d003f057ee615a43359fa156e1ef566d876fce4cb",
  "0x714ebfbe108b4e6ffa894a506dc862bc8604a6da63d968bd4a71e8931205877b",
  "0x084de423bbb8c02c523273f40218c7b03447f3c64bbd77ebc3b96de31a1c812d",
  "0x335631870b8b7cdb40577afadbe7158977a72930a55359f80b740afeb903019d",
  "0x2ffd1acdade3bb23b3f0a63c3825fc64994c43e05859180fe62d75044736db46",
  "0xcee1260bfbfb80b343b7c07574cc2c8839f51d09ce01cabe6ec6f017781a4b46",
  "0x517ee7c5bcbeb4cf9c7e5ecad4fdd8a917f7699a6f2cf75040f99ecdc30f9863",
  "0xa7e1fcf9c53c72cfbf9367b36b641d126fb4720bc0f3b4689c22acc4988a8be7",
  "0x7c895ad01255c49d3934527cf2d05937f4197ba099faa7a89e817835519e2c19",
  "0xce83ded657daeaa5e3ecc52dcf752359afe9e6adf8d91e1a6dece71be81993aa",
  "0x6b26b3f1af7deded268b7af26b52d9d35b20315caae6f637eeec09e8d5a5fc14",
  "0x57d526fff80589a8d36802db9964d000db6de42a9f6f9e6a543179efaeb79c6e",
  "0xb1f5d36972f847d21dbb12fd6ccf8909af77b63b5302d1e2a835fdedff99a471",
  "0x8c66624aecf89da64a5e2cab142f5f654444dde048c7076d03017444b38bba62",
  "0x49017a5977c2736aa3343ae866b64006522a8861b56b8d838e21b8640e062eb8",
  "0x263c57ed8bd1ccad445eaaf146020820b5c02493139b15b61218f4ff033a3e37",
  "0xfb2c3c894270dfe1bf0c883b51c99cd0ce60434b890f0afcc1a7665257fcaff6",
  "0x19fa407a9e7780c4add3e1f6e2e3e179a209110e069fa3a81763ba67e22ab7d1",
  "0xb5d0d75ee32a73f2512a3306ae58ccbecfebb6f4539b7daeaf2c30a07582720a",
];

const BURN_TXS = [
  "0x859b7ffabf3c3711ab33f73fc93bf67052ee44c0b69542dd0144184519940894",
  "0x3e447309a3609eae17ea24c16641408aa9f3c504426028cae834098c8c4c5f16",
  "0xd66c69fc369fce1d58bd2f6c1112b5902b6da3e2b5725a2f65814f699450c13f",
  "0xd37c43fe595c1e428dd97d5eaa6a1b1a163d483340b1cbd7c2d558fbbc9a32b5",
  "0xee2981b7577978a7e6a11fd58cf5c0b67dc0bed1ed2245f10ec654ee8c5c007a",
  "0xe879ed8fadce3187ef4ca691e5e46309c3a8858278ff5fc1a4b136f290be697d",
  "0x0f46876aa1e3960e72f769e71fff8db85b0ebfeab16089a51486d33f658a023e",
  "0x705f9c3216c6f904aa20a6d022bfa4fd5723fc32c8b239472ee991069a3c241f",
  "0xd1b8a588476e2a95afacf8511388a744a565142ff06a59f4b53a180d1cf1648e",
  "0x919569d59826ccfd4ad203ecf6559dc1a020b31bb54b955f3d64ff9f67fdf74d",
  "0xcf94739ffc227f5982bfe888f57c4e8c49b92a17f9129e7b4c6b71835dc09c18",
  "0x57db6f22a0c035f958eb726d0afd64273d72db4d050259e417542deff0e8ae03",
  "0x491e1a60d4852a9232b02de1a287b671a46b407715d9b8bf76de1fefd496be9b",
  "0x85f06f728ead9abaee7a538a3b15bde386d4dc32300a488e3a0f7ae975352c24",
  "0xb8b72a43b0a88f73740a65a6a827cff627fb1efe1902638044c1cc90481fa909",
  "0xf115854b3d5c459e9a00992d067e6e19db5bb49a63e984e0175af79770790c4b",
  "0x2ab5884de486a25f3a63960f6bf0e1f8fb0e6df056d4d3e8740d4c26926d91c5",
  "0xb8dbdc3001e32cb18d9785cf02a5947eee13dfc85f2cff708fd22b81450d0016",
  "0x9f285064c6ab4903dd73e29a4959ab6a05e5f56060eef6b9b9277d41bd21c063",
  "0x7acbe8b904e3109b946a273ae83c484b550690a4fbea6916d627b98ad6b1817e",
  "0xfbaf8f35f8ff98abc882691c4e0b49affaae8ccd24f1b4fdb01c2d7fb038cfa2",
  "0xb347fabcf059afbb7ba5128a2a0b557da295dec62dbf6f0055ca56577ccb6caa",
  "0xd556bdbf2601d0ae65bc05011f10980886fcb7bd2bbadf5b24c0624d63877f8b",
  "0xb36db6bf72b8f8bb43fa78dc4e7732a93eea5ac255142d625e1cadfee656fd48",
  "0xa28af582814cd59dd0be2a432366938384feb5a02084e7a4881384d0dd545fbc",
  "0xfe1435cc8472a80b913dd75bdc60687c0f6d5f2966463b0b75d62f0331c03435",
  "0x4ee545c22a305eac7bd8124fbf04e77799dc09e81e1a540b463b6c5a9fe6e03b",
  "0xfbcabe02ce2db4f3b0b4702547664f92f9d1657f9922f7ac1f779197249daeee",
  "0x7134a6193f8249fbb0496a8e4358bba83cd96b06a068bb43afeb8f08986c435e",
  "0x64e2b0455255a4195ce19792c8507e46a9bfbb656fddd165a39279eefe6dd036",
  "0xcae1156ec2364f6fd57a030e893f5f7223e8b09553bebf6f6d005fa889e76628",
  "0x89704065f92283504b6c35184a0448e568c95fe8214133199623d4a3fd493e6e",
  "0x2af3e030365cb5341e30e0e10eb674f35f4eb4b2f6e4a8a6a0a8d5ec6be63419",
  "0x08e214f657b0824e4557024702a305d9ec521150e9b069758ebc6a98300f8102",
  "0xe6879cba0ce4517070d2215aaaf0fad253413d1d9cd465bfe551f9a99ecaae7c",
  "0x78fa89bfca6b5812640709a6165aeed6190a0a0149bb6d908b4d80ac59d36e9c",
  "0xc6044e354993bf1b7b21391586147d91db4f2ddabf835944cc9f889f1846ef83",
  "0x9b36815a2c1288b030154412f8b47eb76222ea661a6ddb4888966ca84fb5eaf4",
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
