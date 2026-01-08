import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CandidatesService } from '../candidates/candidates.service';
import { firstValueFrom } from 'rxjs';

/**
 * StepStone Integration
 *
 * Funktionen:
 * - Kandidatensuche in StepStone-Datenbank
 * - Kandidaten-Profile importieren
 * - Skills-basierte Suche
 */
@Injectable()
export class StepStoneService {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl = 'https://api.stepstone.de/v1'; // Beispiel-URL

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private candidatesService: CandidatesService,
  ) {
    this.apiKey = this.configService.get<string>('STEPSTONE_API_KEY') || '';
    this.apiSecret = this.configService.get<string>('STEPSTONE_API_SECRET') || '';
  }

  /**
   * Kandidaten suchen
   */
  async searchCandidates(params: {
    skills?: string[];
    location?: string;
    experienceYears?: number;
    limit?: number;
  }): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/candidates/search`, {
          headers: {
            'X-API-Key': this.apiKey,
            'X-API-Secret': this.apiSecret,
          },
          params: {
            skills: params.skills?.join(','),
            location: params.location,
            experience: params.experienceYears,
            limit: params.limit || 50,
          },
        }),
      );

      return response.data.results || [];
    } catch (error) {
      console.error('StepStone API Error:', error.message);
      return [];
    }
  }

  /**
   * Kandidat importieren
   */
  async importCandidate(stepStoneId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/candidates/${stepStoneId}`, {
          headers: {
            'X-API-Key': this.apiKey,
            'X-API-Secret': this.apiSecret,
          },
        }),
      );

      const profile = response.data;

      // Mapping StepStone -> Candidate
      const candidateData = {
        source: 'STEPSTONE' as any,
        externalId: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        title: profile.currentPosition,
        summary: profile.summary,
        location: profile.location,
        experienceYears: profile.yearsOfExperience,
        currentCompany: profile.currentCompany,
      };

      // Kandidat erstellen
      const candidate = await this.candidatesService.create(candidateData);

      // Skills hinzufügen
      if (profile.skills) {
        for (const skill of profile.skills) {
          await this.candidatesService.addSkill(
            candidate.id,
            skill.name,
            skill.level,
            skill.yearsOfExperience,
          );
        }
      }

      return candidate;
    } catch (error) {
      console.error('StepStone Import Error:', error.message);
      throw error;
    }
  }

  /**
   * Batch-Import: Kandidaten nach Skills suchen und importieren
   */
  async batchImportBySkills(skills: string[], limit: number = 50): Promise<any[]> {
    console.log(`🔍 Suche ${limit} Kandidaten mit Skills: ${skills.join(', ')}`);

    const results = await this.searchCandidates({ skills, limit });
    const imported = [];

    for (const result of results) {
      try {
        const candidate = await this.importCandidate(result.id);
        imported.push(candidate);
        console.log(`✅ Importiert: ${candidate.firstName} ${candidate.lastName}`);
      } catch (error) {
        console.error(`❌ Fehler beim Import von ${result.id}:`, error.message);
      }
    }

    console.log(`\n✅ ${imported.length} Kandidaten von StepStone importiert`);
    return imported;
  }
}
