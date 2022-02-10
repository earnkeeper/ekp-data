import {
  logger,
  Transaction,
  TransactionService,
} from '@earnkeeper/ekp-sdk-nestjs';
import { SentryService } from '@earnkeeper/ekp-sdk-nestjs/dist/sdk/sentry/sentry.service';
import { Injectable } from '@nestjs/common';
import bscscan, { account } from 'bsc-scan';
import { ethers } from 'ethers';
import _ from 'lodash';
import moment from 'moment';

@Injectable()
export class BscService {
  constructor(
    private transactionService: TransactionService,
    private sentryService: SentryService,
  ) {}

  onModuleInit() {
    bscscan.setUrl(process.env.BSCSCAN_URL);
    bscscan.setApiKey(process.env.BSCSCAN_API_KEY);
  }

  async syncLogs(contractAddress: string) {
    console.log('Skipping');
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
      const url = `${process.env.BSCSCAN_URL}/api?module=account&action=txlist&address=${contractAddress}&startBlock=${startBlock}&endBlock=${endBlock}&offset=${offset}&page=${page}&sort=${sort}`;
      const transaction = this.sentryService.startTransaction({
        name: url,
        op: url,
      });

      const nextTxs = (await account.getTransactions(contractAddress, {
        startBlock,
        endBlock,
        offset,
        page,
        sort,
      })) as account.Transaction[];

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

      transaction?.finish();
      if (nextTxs.length < offset) {
        logger.log(`${contractAddress} Fetch complete`);

        break;
      }

      startBlock = lastBlock;
    }
  }

  private mapBscTransaction(
    tx: account.Transaction,
    ownerChain: string,
    ownerAddress: string,
  ): Transaction {
    return {
      blockHash: tx.hash,
      blockNumber: Number(tx.blockNumber),
      blockTimestamp: Number(tx.timeStamp),
      fromAddress: tx.from,
      gas: Number(tx.gas),
      gasPrice: Number(ethers.utils.formatEther(tx.gasPrice)),
      hash: tx.hash,
      input: tx.input,
      nonce: Number(tx.nonce),
      ownerAddress,
      ownerChain,
      raw: tx,
      receiptContractAddress: tx.contractAddress,
      receiptCumulativeGasUsed: Number(tx.cumulativeGasUsed),
      receiptGasUsed: Number(tx.gasUsed),
      receiptRoot: undefined,
      receiptStatus: tx.txreceipt_status,
      toAddress: tx.to,
      transactionIndex: Number(tx.transactionIndex),
      value: tx.value,
    };
  }
}
