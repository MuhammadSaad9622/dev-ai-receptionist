import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { FollowUpModule } from '../follow-up/follow-up.module';

@Module({
  imports: [FollowUpModule],
  controllers: [QuotesController],
  providers: [QuotesService],
})
export class QuotesModule {}
