import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from './prisma/prisma.module';
import { CandidatesModule } from './candidates/candidates.module';
import { JobsModule } from './jobs/jobs.module';
import { MatchingModule } from './matching/matching.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ChangeReadinessModule } from './change-readiness/change-readiness.module';
import { CliModule } from './cli/cli.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    PrismaModule,
    CandidatesModule,
    JobsModule,
    MatchingModule,
    IntegrationsModule,
    WebhooksModule,
    ChangeReadinessModule,
    CliModule,
  ],
})
export class AppModule {}
