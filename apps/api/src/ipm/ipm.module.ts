import { Module } from '@nestjs/common';
import { IpmController } from './ipm.controller';

@Module({
  controllers: [IpmController],
})
export class IpmModule {}
