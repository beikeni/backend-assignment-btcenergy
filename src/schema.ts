import { SchemaComposer } from "graphql-compose";
import { Transaction, Wallet } from "./types";
import { fetchDailyTotalConsumption, fetchRawBlock, fetchWalletTransactions } from "./utils";

const schemaComposer = new SchemaComposer();

const TransactionTC = schemaComposer.createObjectTC({
  name: "Transaction",
  fields: {
    hash: "String!",
    size: "Int!",
    time: "Int!",
  },
});

const DailyTotalComnsumptionTC = schemaComposer.createObjectTC({
  name: "DailyTotalConsumption",
  fields: {
    date: "String!",
    consumption: "Float!",
  },
});

const TransactionReportTC = schemaComposer.createObjectTC({
  name: "TransactionReport",
  fields: {
    hash: "String!",
    description: {
      type: "String",
      resolve: () => "Value in kWh",
    },
    powerConsumption: {
      type: "Float!",
      resolve: (transaction: Transaction) => transaction.size * 4.56,
    },
  },
});

const BlockTC = schemaComposer.createObjectTC({
  name: "Block",
  fields: {
    id: "Int!",
    hash: "String!",
    time: "Int!",
    size: "Int!",
    block_index: "Int!",
    height: "Int!",
    txIndexes: "[Int!]!",
    tx: "[Transaction!]!",
    txPowerConsumption: {
      type: "[TransactionReport!]",
      description: "Power consumption for each individual transaction",
      resolve: (block) => block.tx,
    },
  },
});

const WalletTC = schemaComposer.createObjectTC({
  name: "Wallet",
  fields: {
    hash160: "String!",
    address: "String!",
    n_tx: "Int!",
    n_unredeemed: "Int!",
    total_received: "Int!",
    total_sent: "Int!",
    final_balance: "Int!",
    txs: "[Transaction]!",
    totalPowerConsumption: {
      type: "Float!",
      description: "Total power consumption for the selected wallet",
      resolve: (wallet: Wallet) => wallet.txs.reduce((acc: number, { size }) => acc + size * 4.56, 0),
    },
    txsPowerConsumption: {
      type: "[TransactionReport!]",
      description: "Power consumption for each individual transaction",
      resolve: (wallet) => wallet.txs,
    },
  },
});

schemaComposer.Query.addFields({
  block: {
    type: BlockTC,
    args: { hash: "String!" },
    resolve: async (_, { hash }) => {
      try {
        return await fetchRawBlock(hash);
      } catch (error) {
        throw new Error("Failed to fetch block data: ", { cause: error });
      }
    },
  },
  wallet: {
    type: WalletTC,
    args: { address: "String!", limit: "Int", offset: "Int" },
    resolve: async (_, { address, limit, offset }) => {
      return await fetchWalletTransactions(address, limit, offset);
    },
  },
  dailyTotalConsumption: {
    type: [DailyTotalComnsumptionTC],
    args: { numberOfDays: "Int!" },
    resolve: async (_, { numberOfDays = 0 }) => {
      if (numberOfDays < 0) throw new Error("The number of days has to be equal to or greater than 0");
      return await fetchDailyTotalConsumption(numberOfDays);
    },
  },
});

export const schema = schemaComposer.buildSchema();
