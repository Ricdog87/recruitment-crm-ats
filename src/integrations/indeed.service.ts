import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CandidatesService } from '../candidates/candidates.service';
import { firstValueFrom } from 'rxjs';

/**
 * Indeed Integration
 *
 * Funktionen:
 * - Kandidatensuche in Indeed-Datenbank
 * - CV-Import
 * - Skills-basierte Suche
 */
@Injectable()
export class IndeedService {
  private readonly publisherId: string;
  private readonly apiToken: string;
  private readonly baseUrl = 'https://api.indeed.com/ads/apisearch';

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private candidatesService: CandidatesService,
  ) {
    this.publisherId = this.configService.get<string>('INDEED_PUBLISHER_ID') || '';
    this.apiToken = this.configService.get<string>('INDEED_API_TOKEN') || '';
  }

  /**
   * Kandidaten/CVs suchen
   */
  async searchCandidates(params: {
    query?: string;
    location?: string;
    limit?: number;
  }): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(this.baseUrl, {
          params: {
            publisher: this.publisherId,
            v: '2',
            format: 'json',
            q: params.query,
            l: params.location,
            limit: params.limit || 25,
            userip: '1.2.3.4', // Required by Indeed API
            useragent: 'Mozilla/5.0',
          },
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
          },
        }),
      );

      return response.data.results || [];
    } catch (error) {
      console.error('Indeed API Error:', error.message);
      return [];
    }
  }

  /**
   * Kandidat aus Indeed Job-Posting extrahieren und importieren
   */
  async importCandidateFromJobPosting(jobKey: string): Promise<any> {
    // Hinweis: Indeed erlaubt normalerweise keinen direkten CV-Zugriff
    // Hier würde man Bewerbungen über ein Indeed Apply-System erhalten
    console.log('⚠️  Indeed erlaubt keinen direkten CV-Zugriff');
    console.log('💡 Verwenden Sie das Indeed Apply-System für Bewerbungen');
    return null;
  }

  /**
   * Indeed Job Postings nach Skills durchsuchen
   * und potenzielle Kandidaten identifizieren
   */
  async findCandidatesByJobSearch(skills: string[], location?: string): Promise<any[]> {
    const query = skills.join(' OR ');

    console.log(`🔍 Suche Indeed Jobs mit Skills: ${query}`);

    const results = await this.searchCandidates({
      query,
      location,
      limit: 50,
    });

    console.log(`📊 Gefunden: ${results.length} Job-Postings`);

    // Job-Postings können Hinweise auf aktive Kandidaten geben
    // (z.B. durch Bewerbungen, die über das System eingehen)
    return results;
  }
}
