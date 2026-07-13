import { Module } from '@nestjs/common';
import { InterimController } from './interim.controller';

@Module({
  controllers: [InterimController],
})
export class InterimModule {}
