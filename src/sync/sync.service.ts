import {
  logger,
  Transaction,
  TransactionLog,
  TransactionService,
} from '@earnkeeper/ekp-sdk-nestjs';
import { Injectable } from '@nestjs/common';
import _ from 'lodash';
import moment from 'moment';
import { LogDto, TransactionDto } from '../etherscan/dto';
import { EtherscanService } from '../etherscan/etherscan.service';
import { parseNumber } from '../util';

@Injectable()
export class SyncService {
  constructor(
    private transactionService: TransactionService,
    private etherService: EtherscanService,
  ) {}

  async syncLogs(chain: string, contractAddress: string, topic0: string) {
    const lastModel = await this.transactionService.transactionLogModel
      .findOne({
        ownerChain: chain,
        address: contractAddress,
        topic0,
      })
      .sort('-blockNumber')
      .exec();

    let startBlock = lastModel?.blockNumber ?? 0;

    logger.log(
      `Fetching logs for ${contractAddress} starting at ${startBlock}`,
    );

    while (true) {
      const endBlock = 999999999;

      const nextLogs = await this.etherService.getLogs(
        chain,
        contractAddress,
        topic0,
        startBlock,
        endBlock,
      );

      const lastBlock = Number(
        _.chain(nextLogs)
          .map((it) => Number(it.blockNumber))
          .max()
          .value(),
      );

      const endTimestamp = moment.unix(
        Number(
          _.chain(nextLogs)
            .map((it) => Number(it.timeStamp))
            .max()
            .value(),
        ),
      );

      logger.log(
        `${contractAddress}: Fetched ${nextLogs.length} logs from ${startBlock} to ${lastBlock}, ${endTimestamp}`,
      );

      const nextModels = nextLogs.map((log) => this.mapLog(log, chain));

      await this.transactionService.transactionLogModel.bulkWrite(
        nextModels.map((model) => ({
          updateOne: {
            filter: {
              address: model.address,
              logIndex: model.logIndex,
              ownerChain: model.ownerChain,
              topic0: model.topic0,
              transactionHash: model.transactionHash,
            },
            update: { $set: model },
            upsert: true,
          },
        })),
      );

      if (nextLogs.length < 1000) {
        logger.log(`${contractAddress} Log fetch complete`);

        break;
      }

      startBlock = lastBlock;
    }
  }

  async syncTransactions(chain: string, contractAddress: string) {
    const lastModel = await this.transactionService.transactionModel
      .findOne({
        ownerChain: chain,
        ownerAddress: contractAddress,
      })
      .sort('-blockNumber')
      .exec();

    let startBlock = lastModel?.blockNumber ?? 0;

    logger.log(
      `Fetching transactions for ${contractAddress} starting at ${startBlock}`,
    );

    while (true) {
      const endBlock = 999999999;
      const offset = 5000;
      const page = 1;
      const sort = 'asc';

      const nextTxs = await this.etherService.getTransactions(
        chain,
        contractAddress,
        startBlock,
        endBlock,
        offset,
        page,
        sort,
      );

      const lastBlock = Number(
        _.chain(nextTxs)
          .map((it) => Number(it.blockNumber))
          .max()
          .value(),
      );

      const endTimestamp = moment.unix(
        Number(
          _.chain(nextTxs)
            .map((it) => Number(it.timeStamp))
            .max()
            .value(),
        ),
      );

      logger.log(
        `${contractAddress}: Fetched ${nextTxs.length} trans from ${startBlock} to ${lastBlock}, ${endTimestamp}`,
      );

      const nextModels = nextTxs.map((tx) =>
        this.mapTransaction(tx, chain, contractAddress),
      );

      await this.transactionService.transactionModel.bulkWrite(
        nextModels.map((model) => ({
          updateOne: {
            filter: {
              ownerChain: model.ownerChain,
              ownerAddress: contractAddress,
              hash: model.hash,
            },
            update: { $set: model },
            upsert: true,
          },
        })),
      );

      if (nextTxs.length < offset) {
        logger.log(`${contractAddress} Transaction fetch complete`);

        break;
      }

      startBlock = lastBlock;
    }
  }

  private mapTransaction(
    tx: TransactionDto,
    ownerChain: string,
    ownerAddress: string,
  ): Transaction {
    return {
      blockHash: tx.hash,
      blockNumber: Number(tx.blockNumber),
      blockTimestamp: Number(tx.timeStamp),
      fromAddress: tx.from,
      gas: parseNumber(tx.gas),
      gasPrice: parseNumber(tx.gasPrice),
      hash: tx.hash,
      input: tx.input,
      nonce: parseNumber(tx.nonce),
      ownerAddress,
      ownerChain,
      raw: tx,
      receiptContractAddress: tx.contractAddress,
      receiptCumulativeGasUsed: parseNumber(tx.cumulativeGasUsed),
      receiptGasUsed: parseNumber(tx.gasUsed),
      receiptRoot: undefined,
      receiptStatus: tx.txreceipt_status,
      toAddress: tx.to,
      transactionIndex: parseNumber(tx.transactionIndex),
      value: tx.value,
    };
  }

  private mapLog(log: LogDto, ownerChain: string): TransactionLog {
    return {
      address: log.address,
      blockNumber: parseNumber(log.blockNumber),
      blockTimestamp: parseNumber(log.timeStamp),
      data: log.data,
      logIndex: parseNumber(log.logIndex),
      ownerChain,
      transactionHash: log.transactionHash,
      transactionIndex: parseNumber(log.transactionIndex),
      topic0: log.topics[0],
      topic1: log.topics[1],
      topic2: log.topics[2],
    };
  }
}
