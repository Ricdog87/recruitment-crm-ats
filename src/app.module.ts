import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { CandidatesModule } from './modules/candidates/candidates.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { MatchingModule } from './modules/matching/matching.module';
import { PlzModule } from './modules/plz/plz.module';
import { CVParsingModule } from './modules/cv-parsing/cv-parsing.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { HealthController } from './health.controller';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    CompaniesModule,
    ContactsModule,
    ProjectsModule,
    CandidatesModule,
    SubmissionsModule,
    ActivitiesModule,
    MatchingModule,
    PlzModule,
    CVParsingModule,
    DocumentsModule,
    WorkflowsModule,
    AnalyticsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
