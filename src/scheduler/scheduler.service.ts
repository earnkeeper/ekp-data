import { Injectable } from '@nestjs/common';
import { SyncService } from '../sync/sync.service';
import {
  BCOIN_CONTRACT_ADDRESS,
  BHERO_CONTRACT_ADDRESS,
  BHOUSE_CONTRACT_ADDRESS,
  BLOCK_CONTRACT_ADDRESS,
  TRANSFER_TOPIC,
  ZOON_CONTRACT_ADDRESS,
} from '../util/constants';

const bscContracts = [
  ZOON_CONTRACT_ADDRESS,
  BHERO_CONTRACT_ADDRESS,
  BHOUSE_CONTRACT_ADDRESS,
  BCOIN_CONTRACT_ADDRESS,
];

const ethContracts = [BLOCK_CONTRACT_ADDRESS];

@Injectable()
export class SchedulerService {
  private running = false;

  constructor(private syncService: SyncService) {}
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
      await Promise.all([
        ...bscContracts.map((contract) =>
          Promise.all([
            this.syncService.syncTransactions('bsc', contract),
            this.syncService.syncLogs('bsc', contract, TRANSFER_TOPIC),
          ]),
        ),
        ...ethContracts.map((contract) =>
          Promise.all([
            this.syncService.syncTransactions('eth', contract),
            this.syncService.syncLogs('eth', contract, TRANSFER_TOPIC),
          ]),
        ),
      ]);
    } finally {
      this.running = false;
    }
  }
}
