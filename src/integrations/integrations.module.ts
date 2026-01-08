import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LinkedInService } from './linkedin.service';
import { StepStoneService } from './stepstone.service';
import { IndeedService } from './indeed.service';
import { HR4YouService } from './hr4you.service';
import { AdvertsDataScraperService } from './advertsdata-scraper.service';
import { CandidatesModule } from '../candidates/candidates.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [HttpModule, CandidatesModule, JobsModule],
  providers: [
    LinkedInService,
    StepStoneService,
    IndeedService,
    HR4YouService,
    AdvertsDataScraperService,
  ],
  exports: [
    LinkedInService,
    StepStoneService,
    IndeedService,
    HR4YouService,
    AdvertsDataScraperService,
  ],
})
export class IntegrationsModule {}
