import { SdkModule } from '@earnkeeper/ekp-sdk-nestjs';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContractTransactions } from './contract-transactions/contract-transactions.service';
import { Transaction, TransactionSchema } from './schema';

@Module({
  imports: [
    SdkModule,
    // MongooseModule.forFeature([
    //   { name: Transaction.name, schema: TransactionSchema },
    // ]),
  ],
  providers: [ContractTransactions],
})
export class WorkerApp {}
