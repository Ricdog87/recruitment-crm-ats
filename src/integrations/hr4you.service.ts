import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CandidatesService } from '../candidates/candidates.service';
import { JobsService } from '../jobs/jobs.service';
import { firstValueFrom } from 'rxjs';

/**
 * HR4you CRM Integration
 *
 * Funktionen:
 * - Kandidaten aus HR4you importieren
 * - Stellen aus HR4you importieren
 * - Matches zurück zu HR4you syncen
 * - Bidirektionale Synchronisation
 */
@Injectable()
export class HR4YouService {
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private candidatesService: CandidatesService,
    private jobsService: JobsService,
  ) {
    this.apiUrl = this.configService.get<string>('HR4YOU_API_URL') || '';
    this.apiKey = this.configService.get<string>('HR4YOU_API_KEY') || '';
  }

  /**
   * Kandidaten von HR4you importieren
   */
  async importCandidates(limit: number = 100): Promise<any[]> {
    try {
      console.log('🔄 Importiere Kandidaten von HR4you...');

      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/candidates`, {
          headers: {
            'X-API-Key': this.apiKey,
          },
          params: {
            limit,
          },
        }),
      );

      const candidates = response.data.data || [];
      const imported = [];

      for (const hr4youCandidate of candidates) {
        try {
          // Mapping HR4you -> Candidate
          const candidateData = {
            source: 'HR4YOU' as any,
            externalId: hr4youCandidate.id,
            firstName: hr4youCandidate.firstname,
            lastName: hr4youCandidate.lastname,
            email: hr4youCandidate.email,
            phone: hr4youCandidate.phone,
            title: hr4youCandidate.current_position,
            summary: hr4youCandidate.notes,
            location: hr4youCandidate.city,
            experienceYears: hr4youCandidate.years_of_experience,
          };

          const candidate = await this.candidatesService.create(candidateData);
          imported.push(candidate);

          console.log(`✅ ${candidate.firstName} ${candidate.lastName}`);
        } catch (error) {
          console.error(`❌ Fehler beim Import:`, error.message);
        }
      }

      console.log(`\n✅ ${imported.length} Kandidaten von HR4you importiert`);
      return imported;
    } catch (error) {
      console.error('HR4you Import Error:', error.message);
      return [];
    }
  }

  /**
   * Stellen von HR4you importieren
   */
  async importJobs(limit: number = 100): Promise<any[]> {
    try {
      console.log('🔄 Importiere Stellen von HR4you...');

      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/jobs`, {
          headers: {
            'X-API-Key': this.apiKey,
          },
          params: {
            limit,
          },
        }),
      );

      const jobs = response.data.data || [];
      const imported = [];

      for (const hr4youJob of jobs) {
        try {
          // Mapping HR4you -> Job
          const jobData = {
            source: 'HR4YOU' as any,
            externalId: hr4youJob.id,
            title: hr4youJob.title,
            company: hr4youJob.company_name,
            location: hr4youJob.location,
            description: hr4youJob.description,
            requirements: hr4youJob.requirements,
            salaryMin: hr4youJob.salary_min,
            salaryMax: hr4youJob.salary_max,
            status: this.mapStatus(hr4youJob.status),
            publishedAt: new Date(hr4youJob.published_at),
          };

          const job = await this.jobsService.create(jobData);
          imported.push(job);

          console.log(`✅ ${job.title} @ ${job.company}`);
        } catch (error) {
          console.error(`❌ Fehler beim Import:`, error.message);
        }
      }

      console.log(`\n✅ ${imported.length} Stellen von HR4you importiert`);
      return imported;
    } catch (error) {
      console.error('HR4you Import Error:', error.message);
      return [];
    }
  }

  /**
   * Match zu HR4you syncen
   */
  async syncMatchToHR4you(match: any): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/matches`,
          {
            candidate_id: match.candidate.externalId,
            job_id: match.job.externalId,
            match_score: match.overallScore,
            skills_score: match.skillsScore,
            change_readiness_score: match.changeReadinessScore,
            matching_skills: match.matchingSkills,
            missing_skills: match.missingSkills,
          },
          {
            headers: {
              'X-API-Key': this.apiKey,
            },
          },
        ),
      );

      console.log(`✅ Match synced to HR4you`);
    } catch (error) {
      console.error('HR4you Sync Error:', error.message);
    }
  }

  /**
   * Status-Mapping
   */
  private mapStatus(hr4youStatus: string): any {
    const statusMap: Record<string, any> = {
      active: 'OPEN',
      draft: 'DRAFT',
      filled: 'FILLED',
      cancelled: 'CANCELLED',
    };

    return statusMap[hr4youStatus] || 'OPEN';
  }
}
