export interface TransactionDto {
  readonly blockHash: string;
  readonly blockNumber: string;
  readonly confirmations: string;
  readonly contractAddress: string;
  readonly cumulativeGasUsed: string;
  readonly from: string;
  readonly gas: string;
  readonly gasPrice: string;
  readonly gasUsed: string;
  readonly hash: string;
  readonly input: string;
  readonly isError: string;
  readonly nonce: string;
  readonly timeStamp: string;
  readonly to: string;
  readonly transactionIndex: string;
  readonly txreceipt_status: string;
  readonly value: string;
}
