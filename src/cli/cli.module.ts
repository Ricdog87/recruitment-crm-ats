import { Module } from '@nestjs/common';
import { CliService } from './cli.service';
import { CandidatesModule } from '../candidates/candidates.module';
import { JobsModule } from '../jobs/jobs.module';
import { MatchingModule } from '../matching/matching.module';
import { ChangeReadinessModule } from '../change-readiness/change-readiness.module';

@Module({
  imports: [CandidatesModule, JobsModule, MatchingModule, ChangeReadinessModule],
  providers: [CliService],
  exports: [CliService],
})
export class CliModule {}
