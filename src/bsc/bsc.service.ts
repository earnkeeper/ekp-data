import {
  logger,
  Transaction,
  TransactionLog,
  TransactionService,
} from '@earnkeeper/ekp-sdk-nestjs';
import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import _ from 'lodash';
import moment from 'moment';
import { BscScanService } from './bsc-scan.service';
import { LogDto, TransactionDto } from './dto';

@Injectable()
export class BscService {
  constructor(
    private transactionService: TransactionService,
    private bscscanService: BscScanService,
  ) {}

  async syncLogs(contractAddress: string, topic0: string) {
    const existingModels = await this.transactionService.transactionLogModel
      .find({
        address: contractAddress,
        topic0,
      })
      .limit(1)
      .sort('-blockNumber')
      .exec();

    let startBlock = 0;

    if (existingModels.length > 0) {
      startBlock = _.chain(existingModels)
        .map((it) => it.blockNumber)
        .max()
        .value();
    }

    logger.log(
      `Fetching bsc logs for ${contractAddress} starting at ${startBlock}`,
    );

    while (true) {
      const endBlock = 999999999;

      const nextLogs = await this.bscscanService.getLogs(
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

      const nextModels = nextLogs.map((log) => this.mapBscLog(log));

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

  async syncTransactions(contractAddress: string) {
    const existingModels = await this.transactionService.transactionModel
      .find({
        ownerChain: 'bsc',
        ownerAddress: contractAddress,
        source: 'bscscan',
      })
      .exec();

    let startBlock = 0;

    if (existingModels.length > 0) {
      startBlock = _.chain(existingModels)
        .map((it) => it.blockNumber)
        .max()
        .value();
    }

    logger.log(
      `Fetching bsc trans for ${contractAddress} starting at ${startBlock}`,
    );

    while (true) {
      const endBlock = 999999999;
      const offset = 5000;
      const page = 1;
      const sort = 'asc';

      const nextTxs = await this.bscscanService.getTransactions(
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
        this.mapBscTransaction(tx, 'bsc', contractAddress),
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

  private mapBscTransaction(
    tx: TransactionDto,
    ownerChain: string,
    ownerAddress: string,
  ): Transaction {
    return {
      blockHash: tx.hash,
      blockNumber: Number(tx.blockNumber),
      blockTimestamp: Number(tx.timeStamp),
      fromAddress: tx.from,
      gas: isNaN(Number(tx.gas)) ? undefined : Number(tx.gas),
      gasPrice: Number(ethers.utils.formatEther(tx.gasPrice)),
      hash: tx.hash,
      input: tx.input,
      nonce: isNaN(Number(tx.nonce)) ? undefined : Number(tx.nonce),
      ownerAddress,
      ownerChain,
      raw: tx,
      receiptContractAddress: tx.contractAddress,
      receiptCumulativeGasUsed: isNaN(Number(tx.cumulativeGasUsed))
        ? undefined
        : Number(tx.cumulativeGasUsed),
      receiptGasUsed: isNaN(Number(tx.gasUsed))
        ? undefined
        : Number(tx.gasUsed),
      receiptRoot: undefined,
      receiptStatus: tx.txreceipt_status,
      toAddress: tx.to,
      transactionIndex: Number(tx.transactionIndex),
      value: tx.value,
    };
  }

  private mapBscLog(log: LogDto): TransactionLog {
    return {
      address: log.address,
      blockNumber: Number(log.blockNumber),
      blockTimestamp: Number(log.timeStamp),
      data: log.data,
      logIndex: Number(log.logIndex),
      ownerChain: 'bsc',
      transactionHash: log.transactionHash,
      transactionIndex: Number(log.transactionIndex),
      topic0: log.topics[0],
      topic1: log.topics[1],
      topic2: log.topics[2],
    };
  }
}
