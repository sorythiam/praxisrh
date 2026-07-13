import { Global, Module } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { PayoutProviderAdapter } from './payout-provider.adapter';

@Global()
@Module({
  providers: [PayoutsService, PayoutProviderAdapter],
  exports: [PayoutsService, PayoutProviderAdapter],
})
export class PayoutsModule {}
