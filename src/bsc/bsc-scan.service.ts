import { AbstractApiService } from '@earnkeeper/ekp-sdk-nestjs';
import { Injectable } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { LogDto, TransactionDto } from './dto';

@Injectable()
export class BscScanService extends AbstractApiService {
  constructor() {
    super({
      name: BscScanService.name,
      limit: 5,
    });
  }

  async getLogs(
    contractAddress: string,
    topic0: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<LogDto[]> {
    const url = `${process.env.BSCSCAN_URL}/api?module=logs&action=getLogs&address=${contractAddress}&fromBlock=${fromBlock}&toBlock=${toBlock}&topic0=${topic0}&apikey=${process.env.BSCSCAN_API_KEY}`;

    return this.handleCall(
      {
        url,
      },
      async () => {
        const response = await axios.get(url);

        this.checkForBscScanError(response);

        return response.data.result;
      },
    );
  }

  async getTransactions(
    contractAddress: string,
    fromBlock: number,
    toBlock: number,
    offset: number,
    page: number,
    sort: string,
  ): Promise<TransactionDto[]> {
    const url = `${process.env.BSCSCAN_URL}/api?module=logs&action=getLogs&address=${contractAddress}&fromBlock=${fromBlock}&toBlock=${toBlock}&offset=${offset}&page=${page}&sort=${sort}&apikey=${process.env.BSCSCAN_API_KEY}`;

    return this.handleCall(
      {
        url,
      },
      async () => {
        const response = await axios.get(url);

        this.checkForBscScanError(response);

        return response.data.result;
      },
    );
  }

  private checkForBscScanError(response: AxiosResponse<any>) {
    if (!response.data || response.data.status !== '1') {
      if (!!response.data.message) {
        throw new Error(response.data.message);
      }

      throw new Error('Unknown error occurred calling bsc scan api');
    }
  }
}
