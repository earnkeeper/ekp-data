import { SdkModule } from '@earnkeeper/ekp-sdk-nestjs';
import { Module } from '@nestjs/common';
import { EtherscanService } from './etherscan/etherscan.service';
import { SchedulerService } from './scheduler/scheduler.service';
import { SyncService } from './sync/sync.service';
@Module({
  imports: [SdkModule],
  providers: [EtherscanService, SchedulerService, SyncService],
})
export class WorkerApp {}
