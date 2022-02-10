import { SdkModule } from '@earnkeeper/ekp-sdk-nestjs';
import { Module } from '@nestjs/common';
import { BscScanService } from './bsc/bsc-scan.service';
import { BscService } from './bsc/bsc.service';
import { SchedulerService } from './scheduler/scheduler.service';
@Module({
  imports: [SdkModule],
  providers: [BscService, BscScanService, SchedulerService],
})
export class WorkerApp {}
