import { Module } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { MatchingController } from './matching.controller';
import { PlzModule } from '../plz/plz.module';

@Module({
  imports: [PlzModule],
  controllers: [MatchingController],
  providers: [MatchingService],
})
export class MatchingModule {}
