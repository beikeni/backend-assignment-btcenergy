import { SchemaComposer } from "graphql-compose";
import { BlockSize, BlockSummary, RawBlock, Transaction } from "./types";
import { fetchBlocksFromLast24Hours, fetchRawBlock, formatDateToYYYYMMDD, storeBlockIfNotExists } from "./utils";

const schemaComposer = new SchemaComposer();

const MillisecondsInADay = 86400000;

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
    totalConsumption: "Float!",
  },
});

const TransactionReportTC = schemaComposer.createObjectTC({
  name: "TransactionReport",
  fields: {
    hash: "String!",
    description: "String",
    powerConsumption: "Float!",
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
      resolve: (block) => {
        return block.tx.map((transaction: Transaction) => ({
          description: "Transaction power consumption in kWh",
          hash: transaction.hash,
          powerConsumption: transaction.size * 4.56,
        }));
      },
    },
  },
});

schemaComposer.Query.addFields({
  block: {
    type: BlockTC,
    args: {
      hash: "String!",
    },
    resolve: async (_, { hash }) => {
      try {
        return await fetchRawBlock(hash);
      } catch (error) {
        throw new Error("Failed to fetch block data: ", { cause: error });
      }
    },
  },
  dailyTotalConsumption: {
    type: [DailyTotalComnsumptionTC],
    args: {
      numberOfDays: "Int!",
    },
    resolve: async (_, { numberOfDays = 0 }) => {
      if (numberOfDays < 0) throw new Error("The number of days has to be equal or greater to 0");

      const dailyTotalConsumption = [];
      const referenceTime = new Date(Date.now());

      for (let day = 0; day < numberOfDays + 1; day++) {
        referenceTime.setHours(23, 59, 59, 999);
        const referenceTimeUnix = referenceTime.getTime();
        const blockSummaries: BlockSummary[] = await fetchBlocksFromLast24Hours(referenceTimeUnix);

        const blockPromises: Promise<BlockSize>[] = blockSummaries.map(async (block: BlockSummary) => {
          // insert caching here
          const storedBlock = await storeBlockIfNotExists(block);
          return storedBlock;
        });

        const blocks: BlockSize[] = await Promise.all(blockPromises);
        const totalConsumption = blocks.reduce((acc: number, { size }: { size: number }) => {
          return acc + size * 4.56;
        }, 0);

        dailyTotalConsumption.push({
          date: formatDateToYYYYMMDD(referenceTime),
          totalConsumption,
        });

        referenceTime.setDate(referenceTime.getDate() - 1);
      }
      return dailyTotalConsumption;
    },
  },
});

export const schema = schemaComposer.buildSchema();
