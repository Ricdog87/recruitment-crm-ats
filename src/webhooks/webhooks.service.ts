import { Injectable } from '@nestjs/common';
import { CandidatesService } from '../candidates/candidates.service';
import { JobsService } from '../jobs/jobs.service';
import { MatchingService } from '../matching/matching.service';
import { ChangeReadinessService } from '../change-readiness/change-readiness.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/**
 * Webhooks Service
 *
 * Verarbeitet Webhooks von n8n und anderen Systemen
 * Sendet auch Webhooks zurück zu n8n für Workflow-Continuation
 */
@Injectable()
export class WebhooksService {
  private readonly n8nWebhookUrl: string;

  constructor(
    private candidatesService: CandidatesService,
    private jobsService: JobsService,
    private matchingService: MatchingService,
    private changeReadinessService: ChangeReadinessService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.n8nWebhookUrl = this.configService.get<string>('N8N_WEBHOOK_URL') || '';
  }

  /**
   * Handler: Neuer Kandidat
   */
  async handleNewCandidate(payload: any): Promise<any> {
    console.log('📥 Webhook: Neuer Kandidat', payload);

    // Kandidat erstellen
    const candidate = await this.candidatesService.create({
      source: payload.source || 'MANUAL',
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      title: payload.title,
      location: payload.location,
      experienceYears: payload.experienceYears,
    });

    // Skills hinzufügen
    if (payload.skills && Array.isArray(payload.skills)) {
      for (const skill of payload.skills) {
        await this.candidatesService.addSkill(candidate.id, skill);
      }
    }

    // Wechselwilligkeit berechnen
    const changeReadiness = await this.changeReadinessService.calculateScore(candidate.id);

    // Automatisches Matching: Passende Jobs finden
    const matches = await this.matchingService.findJobsForCandidate(candidate.id, 70);

    // n8n benachrichtigen
    await this.notifyN8n('candidate.created', {
      candidate,
      changeReadiness,
      matches: matches.slice(0, 5), // Top 5 Matches
    });

    return {
      success: true,
      candidate,
      changeReadiness,
      matchesFound: matches.length,
    };
  }

  /**
   * Handler: Neue Stelle
   */
  async handleNewJob(payload: any): Promise<any> {
    console.log('📥 Webhook: Neue Stelle', payload);

    // Job erstellen
    const job = await this.jobsService.create({
      source: payload.source || 'MANUAL',
      title: payload.title,
      company: payload.company,
      location: payload.location,
      description: payload.description,
      requirements: payload.requirements,
      salaryMin: payload.salaryMin,
      salaryMax: payload.salaryMax,
      status: payload.status || 'OPEN',
    });

    // Required Skills hinzufügen
    if (payload.requiredSkills && Array.isArray(payload.requiredSkills)) {
      for (const skill of payload.requiredSkills) {
        await this.jobsService.addRequiredSkill(job.id, skill, true, 'HIGH');
      }
    }

    // Automatisches Matching: Passende Kandidaten finden
    const matches = await this.matchingService.findCandidatesForJob(job.id, 70);

    // Nur wechselbereite Kandidaten (Score >= 70)
    const changeReadyCandidates = matches.filter((m) => m.changeReadinessScore >= 70);

    // n8n benachrichtigen
    await this.notifyN8n('job.created', {
      job,
      matchesFound: matches.length,
      changeReadyCandidates: changeReadyCandidates.slice(0, 10), // Top 10
    });

    return {
      success: true,
      job,
      matchesFound: matches.length,
      changeReadyCandidatesFound: changeReadyCandidates.length,
    };
  }

  /**
   * Handler: Finde Kandidaten für Stelle
   */
  async handleFindCandidates(payload: any): Promise<any> {
    const { jobId, minScore = 70, onlyChangeReady = true } = payload;

    const matches = await this.matchingService.findCandidatesForJob(jobId, minScore);

    // Nur wechselbereite?
    let results = matches;
    if (onlyChangeReady) {
      results = matches.filter((m) => m.changeReadinessScore >= 70);
    }

    // Nach Wechselwilligkeit sortieren
    results.sort((a, b) => b.changeReadinessScore - a.changeReadinessScore);

    return {
      success: true,
      jobId,
      matchesFound: results.length,
      matches: results,
    };
  }

  /**
   * Handler: Finde Stellen für Kandidat
   */
  async handleFindJobs(payload: any): Promise<any> {
    const { candidateId, minScore = 70 } = payload;

    const matches = await this.matchingService.findJobsForCandidate(candidateId, minScore);

    return {
      success: true,
      candidateId,
      matchesFound: matches.length,
      matches,
    };
  }

  /**
   * Handler: Wechselwilligkeit berechnen
   */
  async handleCalculateChangeReadiness(candidateId: string): Promise<any> {
    const changeReadiness = await this.changeReadinessService.calculateScore(candidateId);

    return {
      success: true,
      candidateId,
      changeReadiness,
    };
  }

  /**
   * Handler: Top wechselbereite Kandidaten
   */
  async handleGetTopChangeReady(): Promise<any> {
    const candidates = await this.changeReadinessService.getTopChangeReady(50);

    return {
      success: true,
      count: candidates.length,
      candidates,
    };
  }

  /**
   * Handler: LinkedIn Aktivität updaten
   */
  async handleUpdateLinkedInActivity(payload: any): Promise<any> {
    const { candidateId, lastActivity, profileUpdated, openToWork } = payload;

    // Kandidat updaten
    await this.candidatesService.update(candidateId, {
      lastActivity: lastActivity ? new Date(lastActivity) : undefined,
      profileUpdatedAt: profileUpdated ? new Date(profileUpdated) : undefined,
    });

    // Open to Work Signal setzen
    if (openToWork !== undefined) {
      await this.changeReadinessService.setOpenToWork(candidateId, openToWork);
    }

    // Wechselwilligkeit neu berechnen
    const changeReadiness = await this.changeReadinessService.calculateScore(candidateId);

    return {
      success: true,
      candidateId,
      changeReadiness,
    };
  }

  /**
   * n8n benachrichtigen
   */
  private async notifyN8n(event: string, data: any): Promise<void> {
    if (!this.n8nWebhookUrl) {
      console.log('⚠️  N8N_WEBHOOK_URL nicht konfiguriert');
      return;
    }

    try {
      await firstValueFrom(
        this.httpService.post(this.n8nWebhookUrl, {
          event,
          data,
          timestamp: new Date(),
        }),
      );

      console.log(`✅ n8n benachrichtigt: ${event}`);
    } catch (error) {
      console.error('❌ n8n Notification Error:', error.message);
    }
  }
}
