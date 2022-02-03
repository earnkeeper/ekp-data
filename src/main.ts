import { NestFactory } from '@nestjs/core';
import { WorkerApp } from './worker.app';

const run = async () => {
  const app = await NestFactory.create(WorkerApp);

  await app.init();
};

run();
