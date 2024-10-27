import fs from "fs";
import { Mutex } from "async-mutex";
import { BlockSize, BlockSummary, RawBlock, Wallet } from "./types";

const fileMutex = new Mutex();

export const storeBlockIfNotExists = async (block: { hash: string }): Promise<BlockSize> => {
  const filePath = "src/blocks.json";

  const data = fs.readFileSync(filePath, "utf-8");
  const blocks = JSON.parse(data);

  let existingBlock = blocks.find((b: { hash: string }) => b.hash === block.hash);

  if (!existingBlock) {
    const { size } = await (await fetch(`https://blockchain.info/rawblock/${block.hash}`)).json();
    existingBlock = { hash: block.hash, size };

    const release = await fileMutex.acquire();

    const data = fs.readFileSync(filePath, "utf-8");
    const writeBlocks = JSON.parse(data);
    writeBlocks.push(existingBlock);
    fs.writeFileSync(filePath, JSON.stringify(writeBlocks, null, 2), "utf-8");

    release();
    console.log(`Block with hash ${block.hash} stored.`);
  }
  return existingBlock;
};

export const formatDateToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const fetchRawBlock = async (hash: string): Promise<RawBlock> => {
  const response = await fetch(`https://blockchain.info/rawblock/${hash}`);
  const data = await response.json();
  return data;
};

export const fetchBlocksFromLast24Hours = async (upperBound: number): Promise<BlockSummary[]> => {
  const response = await fetch(`https://blockchain.info/blocks/${upperBound}?format=json`);
  const data = await response.json();
  return data;
};

export const fetchWalletTransactions = async (address: string, limit: number = 0, offset: number = 0): Promise<Wallet> => {
  let url = `https://blockchain.info/rawaddr/${address}`;
  if (limit > 0 && offset > 0) url + `?limit=${limit}&offset=${offset}`;
  else if (limit > 0) url += `?limit=${limit}`;
  else if (offset > 0) url += `?offset=${offset}`;
  const response = await fetch(url);
  const data = await response.json();
  return data;
};
