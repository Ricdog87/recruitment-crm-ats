import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { MatchingService } from './matching.service';

@Controller('matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Post('jobs/:jobId/find-candidates')
  async findCandidatesForJob(@Param('jobId') jobId: string, @Query('minScore') minScore?: number) {
    return this.matchingService.findCandidatesForJob(jobId, minScore ? Number(minScore) : 60);
  }

  @Post('candidates/:candidateId/find-jobs')
  async findJobsForCandidate(
    @Param('candidateId') candidateId: string,
    @Query('minScore') minScore?: number,
  ) {
    return this.matchingService.findJobsForCandidate(
      candidateId,
      minScore ? Number(minScore) : 60,
    );
  }

  @Get('jobs/:jobId/top-matches')
  async getTopMatchesForJob(@Param('jobId') jobId: string, @Query('limit') limit?: number) {
    return this.matchingService.getTopMatchesForJob(jobId, limit ? Number(limit) : 20);
  }

  @Get('candidates/:candidateId/top-matches')
  async getTopMatchesForCandidate(
    @Param('candidateId') candidateId: string,
    @Query('limit') limit?: number,
  ) {
    return this.matchingService.getTopMatchesForCandidate(
      candidateId,
      limit ? Number(limit) : 20,
    );
  }
}
