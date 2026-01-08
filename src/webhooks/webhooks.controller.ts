import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

/**
 * n8n Webhook Endpoints
 *
 * Diese Endpoints werden von n8n aufgerufen für:
 * - Workflow-Automation
 * - Trigger-basierte Aktionen
 * - Bidirektionale Integration
 */
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * n8n: Neuer Kandidat
   */
  @Post('n8n/candidate/new')
  async newCandidate(@Body() payload: any) {
    return this.webhooksService.handleNewCandidate(payload);
  }

  /**
   * n8n: Neue Stelle
   */
  @Post('n8n/job/new')
  async newJob(@Body() payload: any) {
    return this.webhooksService.handleNewJob(payload);
  }

  /**
   * n8n: Finde Kandidaten für Stelle
   */
  @Post('n8n/matching/find-candidates')
  async findCandidates(@Body() payload: any) {
    return this.webhooksService.handleFindCandidates(payload);
  }

  /**
   * n8n: Finde Stellen für Kandidat
   */
  @Post('n8n/matching/find-jobs')
  async findJobs(@Body() payload: any) {
    return this.webhooksService.handleFindJobs(payload);
  }

  /**
   * n8n: Wechselwilligkeit berechnen
   */
  @Post('n8n/change-readiness/calculate/:candidateId')
  async calculateChangeReadiness(@Param('candidateId') candidateId: string) {
    return this.webhooksService.handleCalculateChangeReadiness(candidateId);
  }

  /**
   * n8n: Top wechselbereite Kandidaten
   */
  @Get('n8n/change-readiness/top')
  async getTopChangeReady() {
    return this.webhooksService.handleGetTopChangeReady();
  }

  /**
   * n8n: LinkedIn Aktivität updaten
   */
  @Post('n8n/linkedin/update-activity')
  async updateLinkedInActivity(@Body() payload: any) {
    return this.webhooksService.handleUpdateLinkedInActivity(payload);
  }

  /**
   * Generic Webhook Test
   */
  @Post('test')
  async test(@Body() payload: any) {
    console.log('📥 Webhook Test:', payload);
    return {
      success: true,
      message: 'Webhook received',
      payload,
      timestamp: new Date(),
    };
  }
}
