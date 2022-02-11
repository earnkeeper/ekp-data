import { AbstractApiService } from '@earnkeeper/ekp-sdk-nestjs';
import { Injectable } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { validate } from 'bycontract';
import { LogDto, TransactionDto } from './dto';

@Injectable()
export class EtherscanService extends AbstractApiService {
  constructor() {
    super({
      name: EtherscanService.name,
      limit: 5,
    });
  }

  getBaseUrl(chain: string) {
    validate(chain, 'string');

    switch (chain) {
      case 'bsc':
        return validate(process.env.BSCSCAN_URL, 'string');
      case 'eth':
        return validate(process.env.ETHERSCAN_URL, 'string');
      default:
        throw new Error('Unsupported chain: ' + chain);
    }
  }

  getApiKey(chain: string) {
    validate(chain, 'string');

    switch (chain) {
      case 'bsc':
        return validate(process.env.BSCSCAN_API_KEY, 'string');
      case 'eth':
        return validate(process.env.ETHERSCAN_API_KEY, 'string');
      default:
        throw new Error('Unsupported chain: ' + chain);
    }
  }

  async getLogs(
    chain: string,
    contractAddress: string,
    topic0: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<LogDto[]> {
    const url = `${this.getBaseUrl(
      chain,
    )}/api?module=logs&action=getLogs&address=${contractAddress}&fromBlock=${fromBlock}&toBlock=${toBlock}&topic0=${topic0}&apikey=${this.getApiKey(
      chain,
    )}`;

    return this.handleCall(
      {
        url,
      },
      async () => {
        const response = await axios.get(url);

        this.handleErrors(response);

        return response.data.result;
      },
    );
  }

  async getTransactions(
    chain: string,
    contractAddress: string,
    fromBlock: number,
    toBlock: number,
    offset: number,
    page: number,
    sort: string,
  ): Promise<TransactionDto[]> {
    const url = `${this.getBaseUrl(
      chain,
    )}/api?module=account&action=txlist&address=${contractAddress}&startBlock=${fromBlock}&endBlock=${toBlock}&offset=${offset}&page=${page}&sort=${sort}&apikey=${this.getApiKey(
      chain,
    )}`;

    return this.handleCall(
      {
        url,
      },
      async () => {
        const response = await axios.get(url);

        this.handleErrors(response);

        return response.data.result;
      },
    );
  }

  private handleErrors(response: AxiosResponse<any>) {
    if (!response.data || response.data.status !== '1') {
      if (!!response.data.message) {
        throw new Error(response.data.message);
      }

      throw new Error('Unknown error occurred calling ether scan api');
    }
  }
}
