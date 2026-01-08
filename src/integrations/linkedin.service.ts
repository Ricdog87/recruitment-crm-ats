import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CandidatesService } from '../candidates/candidates.service';
import { firstValueFrom } from 'rxjs';

/**
 * LinkedIn Integration
 *
 * Funktionen:
 * - Kandidaten-Profile abrufen
 * - Kandidaten-Aktivität tracken (für Wechselwilligkeit)
 * - "Open to Work" Status prüfen
 * - LinkedIn Recruiter Lite API Integration
 */
@Injectable()
export class LinkedInService {
  private readonly baseUrl = 'https://api.linkedin.com/v2';
  private readonly accessToken: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private candidatesService: CandidatesService,
  ) {
    this.accessToken = this.configService.get<string>('LINKEDIN_ACCESS_TOKEN') || '';
  }

  /**
   * Kandidaten-Profil von LinkedIn abrufen
   */
  async fetchProfile(linkedInUrl: string): Promise<any> {
    try {
      // LinkedIn Profile API
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/people/${this.extractLinkedInId(linkedInUrl)}`, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }),
      );

      return response.data;
    } catch (error) {
      console.error('LinkedIn API Error:', error.message);
      throw error;
    }
  }

  /**
   * Kandidat von LinkedIn importieren
   */
  async importCandidate(linkedInUrl: string): Promise<any> {
    const profile = await this.fetchProfile(linkedInUrl);

    // Mapping LinkedIn -> Candidate
    const candidateData = {
      source: 'LINKEDIN' as any,
      externalId: profile.id,
      firstName: profile.firstName?.localized?.de_DE || profile.firstName?.localized?.en_US,
      lastName: profile.lastName?.localized?.de_DE || profile.lastName?.localized?.en_US,
      title: profile.headline?.localized?.de_DE || profile.headline?.localized?.en_US,
      summary: profile.summary?.localized?.de_DE || profile.summary?.localized?.en_US,
      location: profile.location?.name,
      linkedinUrl: linkedInUrl,
      lastActivity: new Date(), // Wir setzen aktuelles Datum als letzte Aktivität
    };

    // Kandidat erstellen
    const candidate = await this.candidatesService.create(candidateData);

    // Skills extrahieren (falls vorhanden)
    if (profile.skills) {
      for (const skill of profile.skills) {
        await this.candidatesService.addSkill(candidate.id, skill.name);
      }
    }

    return candidate;
  }

  /**
   * Kandidaten-Aktivität prüfen (für Wechselwilligkeit-Score)
   */
  async checkActivity(linkedInUrl: string): Promise<{ lastActivity: Date; hasUpdates: boolean }> {
    try {
      // LinkedIn Activity API (Posts, Profil-Updates, etc.)
      // Hinweis: Hierfür benötigt man LinkedIn Recruiter Lite API-Zugriff
      const linkedInId = this.extractLinkedInId(linkedInUrl);

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/people/${linkedInId}/shares`, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }),
      );

      const posts = response.data.elements || [];

      if (posts.length > 0) {
        const latestPost = posts[0];
        return {
          lastActivity: new Date(latestPost.created.time),
          hasUpdates: true,
        };
      }

      return {
        lastActivity: new Date(),
        hasUpdates: false,
      };
    } catch (error) {
      console.error('LinkedIn Activity Check Error:', error.message);
      return {
        lastActivity: new Date(),
        hasUpdates: false,
      };
    }
  }

  /**
   * "Open to Work" Status prüfen
   */
  async checkOpenToWork(linkedInUrl: string): Promise<boolean> {
    try {
      const profile = await this.fetchProfile(linkedInUrl);

      // LinkedIn hat ein "Open to Work" Feature
      // Das kann über das Profil abgefragt werden
      return profile.openToWork === true;
    } catch (error) {
      console.error('LinkedIn Open to Work Check Error:', error.message);
      return false;
    }
  }

  /**
   * Batch-Update: Wechselwilligkeit für alle LinkedIn-Kandidaten aktualisieren
   */
  async updateChangeReadinessForAllLinkedInCandidates(): Promise<void> {
    const candidates = await this.candidatesService.findAll({
      where: {
        source: 'LINKEDIN',
        isActive: true,
      },
    });

    for (const candidate of candidates) {
      if (candidate.linkedinUrl) {
        try {
          // Aktivität prüfen
          const activity = await this.checkActivity(candidate.linkedinUrl);

          // Kandidat updaten
          await this.candidatesService.update(candidate.id, {
            lastActivity: activity.lastActivity,
            profileUpdatedAt: activity.hasUpdates ? new Date() : candidate.profileUpdatedAt,
          });

          // Open to Work prüfen
          const openToWork = await this.checkOpenToWork(candidate.linkedinUrl);
          if (openToWork && candidate.changeReadiness) {
            // TODO: ChangeReadiness Service aufrufen
          }
        } catch (error) {
          console.error(
            `Error updating candidate ${candidate.id}:`,
            error.message,
          );
        }
      }
    }

    console.log(`✅ Updated ${candidates.length} LinkedIn candidates`);
  }

  /**
   * LinkedIn ID aus URL extrahieren
   */
  private extractLinkedInId(linkedInUrl: string): string {
    // Beispiel: https://www.linkedin.com/in/max-mustermann-123456/
    const match = linkedInUrl.match(/\/in\/([^\/]+)/);
    return match ? match[1] : '';
  }
}
