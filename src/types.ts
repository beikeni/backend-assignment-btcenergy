export type BlockSummary = Pick<RawBlock, "hash" | "height" | "time" | "block_index">;
export type BlockSize = Pick<RawBlock, "hash" | "size">;

export type RawBlock = {
  hash: string;
  ver: number;
  prev_block: string;
  mrkl_root: string;
  time: number;
  bits: number;
  next_block: string[];
  fee: number;
  nonce: number;
  n_tx: number;
  size: number;
  block_index: number;
  main_chain: boolean;
  height: number;
  weight: number;
  tx: Transaction[];
};

export type TransactionSize = Pick<Transaction, "hash" | "size">;

export type Transaction = {
  hash: string;
  ver: number;
  vin_sz: number;
  vout_sz: number;
  size: number;
  weight: number;
  fee: number;
  relayed_by: string;
  lock_time: number;
  tx_index: number;
  double_spend: boolean;
  time: number;
  block_index: number;
  block_height: number;
  inputs: Input[];
  out: Output[];
};

export type Input = {
  sequence: number;
  witness: string;
  script: string;
  index: number;
  prev_out: PrevOut;
};

export type PrevOut = {
  type: number;
  spent: boolean;
  value: number;
  spending_outpoints: SpendingOutpoint[];
  n: number;
  tx_index: number;
  script: string;
};

export type SpendingOutpoint = {
  tx_index: number;
  n: number;
};

export type Output = {
  type: number;
  spent: boolean;
  value: number;
  spending_outpoints: SpendingOutpoint[];
  n: number;
  tx_index: number;
  script: string;
  addr?: string;
};

export type Wallet = {
  hash160: string;
  address: string;
  n_tx: number;
  n_unredeemed: number;
  total_received: number;
  total_sent: number;
  final_balance: number;
  txs: Transaction[];
};
