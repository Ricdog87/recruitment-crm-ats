import { Module } from '@nestjs/common';
import { ChangeReadinessService } from './change-readiness.service';
import { ChangeReadinessController } from './change-readiness.controller';

@Module({
  controllers: [ChangeReadinessController],
  providers: [ChangeReadinessService],
  exports: [ChangeReadinessService],
})
export class ChangeReadinessModule {}
