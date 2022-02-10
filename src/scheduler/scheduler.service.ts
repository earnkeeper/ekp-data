import { Injectable } from '@nestjs/common';
import { BscService } from '../bsc/bsc.service';
import {
  BCOIN_CONTRACT_ADDRESS,
  BHERO_CONTRACT_ADDRESS,
  BHOUSE_CONTRACT_ADDRESS,
  ZOON_CONTRACT_ADDRESS,
} from '../util/constants';

const contracts = [
  ZOON_CONTRACT_ADDRESS,
  BHERO_CONTRACT_ADDRESS,
  BHOUSE_CONTRACT_ADDRESS,
  BCOIN_CONTRACT_ADDRESS,
];

@Injectable()
export class SchedulerService {
  private running = false;

  constructor(private bscService: BscService) {}
  onModuleInit() {
    this.onSchedule();

    setInterval(() => {
      this.onSchedule();
    }, 30000);
  }

  async onSchedule() {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      await Promise.all(
        contracts.map((contract) =>
          Promise.all([
            this.bscService.syncTransactions(contract),
            this.bscService.syncLogs(contract),
          ]),
        ),
      );
    } finally {
      this.running = false;
    }
  }
}
