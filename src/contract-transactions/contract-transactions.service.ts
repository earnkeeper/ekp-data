import {
  logger,
  Transaction,
  TransactionService,
} from '@earnkeeper/ekp-sdk-nestjs';
import { Injectable } from '@nestjs/common';
import bscscan, { account } from 'bsc-scan';
import { ethers } from 'ethers';
import _ from 'lodash';
import moment from 'moment';
import { ZOON_CONTRACT_ADDRESS } from '../util/constants';

const contracts = [ZOON_CONTRACT_ADDRESS];

@Injectable()
export class ContractTransactions {
  constructor(private transactionService: TransactionService) {}

  onModuleInit() {
    bscscan.setUrl(process.env.BSCSCAN_URL);
    bscscan.setApiKey(process.env.BSCSCAN_KEY);

    this.fetchBscTrans();
  }

  async fetchBscTrans() {
    for (const contract of contracts) {
      this.fetchBscTransForContract(contract);
    }
  }

  async fetchBscTransForContract(contractAddress: string) {
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
      const nextTxs = (await account.getTransactions(contractAddress, {
        startBlock,
        endBlock: 999999999,
        offset: 0,
        page: 0,
        sort: 'asc',
      })) as account.Transaction[];

      if (nextTxs.length === 0) {
        logger.log(`Fetch complete`);

        break;
      }

      const endBlock = Number(
        _.chain(nextTxs).maxBy('blockNumber').get('blockNumber').value(),
      );

      const endTimestamp = moment.unix(
        Number(_.chain(nextTxs).maxBy('timeStamp').get('timeStamp').value()),
      );

      logger.log(
        `${contractAddress}: Fetched ${nextTxs.length} trans from ${startBlock} to ${endBlock}, ${endTimestamp}`,
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
            },
            update: { $set: model },
            upsert: true,
          },
        })),
      );

      startBlock = endBlock;
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
