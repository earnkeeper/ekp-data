import { SdkModule } from '@earnkeeper/ekp-sdk-nestjs';
import { Module } from '@nestjs/common';
import { BscService } from './bsc/bsc.service';
import { SchedulerService } from './scheduler/scheduler.service';
@Module({
  imports: [SdkModule],
  providers: [BscService, SchedulerService],
})
export class WorkerApp {}
