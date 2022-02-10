export interface LogDto {
  readonly address: string;
  readonly blockNumber: string;
  readonly data: string;
  readonly gasPrice: string;
  readonly gasUsed: string;
  readonly logIndex: string;
  readonly timeStamp: string;
  readonly topics: string[];
  readonly transactionHash: string;
  readonly transactionIndex: string;
}
