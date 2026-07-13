import { Module } from '@nestjs/common';
import { EstablishmentsController } from './establishments.controller';
import { UsersController } from './users.controller';

@Module({
  controllers: [EstablishmentsController, UsersController],
})
export class SubscriptionModule {}
