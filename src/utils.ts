import fs from "fs";
import { Mutex } from "async-mutex";
import { BlockSize, BlockSummary, DailyConsumption, RawBlock, Wallet } from "./types";

// Mutex for writing on the json file. Also for development only
const fileMutex = new Mutex();

/**
 * This function fetches a raw block and stores it in a local json file for fast retrieval.
 * Designed purely to shorten the feedback loop during development.
 *
 * @param {Object} block - The block object containing the hash.
 * @param {string} block.hash - The hash of the block to fetch.
 * @returns {Promise<BlockSize>} A promise that resolves to the block size.
 */
export const retrieveOrFetchBlockSize = async (block: { hash: string }): Promise<BlockSize> => {
  const filePath = "src/blocks.json";

  const data = fs.readFileSync(filePath, "utf-8");
  const blocks = JSON.parse(data);

  let blockSize: BlockSize = blocks.find((b: { hash: string }) => b.hash === block.hash);

  if (!blockSize || !blockSize.size) {
    const { size } = await fetchRawBlock(block.hash);
    blockSize = { hash: block.hash, size };

    const release = await fileMutex.acquire();

    const data = fs.readFileSync(filePath, "utf-8");
    const writeBlocks = JSON.parse(data);
    writeBlocks.push(blockSize);
    fs.writeFileSync(filePath, JSON.stringify(writeBlocks, null, 2), "utf-8");

    release();
  }
  return blockSize;
};

/**
 * Formats a Date object into a string in the format YYYY-MM-DD.
 *
 * @param {Date} date - The date to format.
 * @returns {string} The formatted date string.
 */
export const formatDateToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Fetches raw block data from the blockchain.info API for a given block hash.
 *
 * @param {string} hash - The hash of the block to fetch.
 * @returns {Promise<RawBlock>} A promise that resolves to the raw block data.
 */
export const fetchRawBlock = async (hash: string): Promise<RawBlock> => {
  const response = await fetch(`https://blockchain.info/rawblock/${hash}`);
  const data = await response.json();
  return data;
};

/**
 * Fetches block summaries from the blockchain.info API for blocks mined in the last 24 hours.
 *
 * @param {number} upperBound - The upper bound timestamp to fetch blocks up to.
 * @returns {Promise<BlockSummary[]>} A promise that resolves to an array of block summaries.
 */
export const fetchBlocksFromLast24Hours = async (upperBound: number): Promise<BlockSummary[]> => {
  const response = await fetch(`https://blockchain.info/blocks/${upperBound}?format=json`);
  const data = await response.json();
  return data;
};

/**
 * Fetches wallet transactions from the blockchain.info API for a given address.
 *
 * @param {string} address - The wallet address to fetch transactions for.
 * @param {number} [limit=0] - The maximum number of transactions to fetch. Defaults to 0, which means no limit.
 * @param {number} [offset=0] - The number of transactions to skip. Defaults to 0, which means no offset.
 * @returns {Promise<Wallet>} A promise that resolves to the wallet data containing transactions.
 */
export const fetchWalletTransactions = async (
  address: string,
  limit: number = 0,
  offset: number = 0
): Promise<Wallet> => {
  let url = `https://blockchain.info/rawaddr/${address}`;
  if (limit > 0 && offset > 0) url + `?limit=${limit}&offset=${offset}`;
  else if (limit > 0) url += `?limit=${limit}`;
  else if (offset > 0) url += `?offset=${offset}`;
  const response = await fetch(url);
  const data = await response.json();
  return data;
};

/**
 * Calculates the daily total consumption for a specified number of days. Starts from the current date and
 * walks backwards for an `n` number of days provided as argument.
 *
 * @param {number} numberOfDays - The number of days to calculate the total consumption for.
 * @returns {Promise<DailyConsumption[]>} A promise that resolves to an array of daily consumption data.
 */
export const fetchDailyTotalConsumption = async (numberOfDays: number): Promise<DailyConsumption[]> => {
  const dailyTotalConsumption = [];
  const referenceTime = new Date(Date.now());

  for (let day = 0; day <= numberOfDays; day++) {
    referenceTime.setHours(23, 59, 59, 999);
    const referenceTimeUnix = referenceTime.getTime();
    const blockSummaries: BlockSummary[] = await fetchBlocksFromLast24Hours(referenceTimeUnix);

    const blockPromises: Promise<BlockSize>[] = blockSummaries.map(async (block: BlockSummary) => {
      const storedBlock: BlockSize = await retrieveOrFetchBlockSize(block);
      return storedBlock;
    });

    const blocks: BlockSize[] = await Promise.all(blockPromises);
    const totalConsumption = blocks.reduce((acc: number, { size }) => {
      return acc + size * 4.56;
    }, 0);

    dailyTotalConsumption.push({
      date: formatDateToYYYYMMDD(referenceTime),
      consumption: totalConsumption,
    });

    referenceTime.setDate(referenceTime.getDate() - 1);
  }
  return dailyTotalConsumption;
};
