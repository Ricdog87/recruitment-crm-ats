import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChangeReadiness, Candidate } from '@prisma/client';

/**
 * Service für Wechselwilligkeit-Tracking
 *
 * Dieser Service berechnet einen Score (0-100) basierend auf verschiedenen Indikatoren:
 * - LinkedIn-Aktivität (Profil-Updates, Posts, etc.)
 * - "Open to Work" Signal
 * - Profil-Änderungen
 * - Response-Rate auf Kontaktversuche
 *
 * ZIEL: Kandidaten identifizieren, die JETZT wechselbereit sind!
 */
@Injectable()
export class ChangeReadinessService {
  constructor(private prisma: PrismaService) {}

  /**
   * Wechselwilligkeit-Score berechnen
   */
  async calculateScore(candidateId: string): Promise<ChangeReadiness> {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    // Indikatoren berechnen
    const linkedinActivityScore = this.calculateLinkedInActivity(candidate);
    const profileUpdateScore = this.calculateProfileUpdateScore(candidate);
    const jobSearchSignals = this.calculateJobSearchSignals(candidate);
    const responseRate = 80; // Placeholder - würde aus Activity-Historie berechnet

    // Gewichteter Gesamt-Score
    const overallScore = Math.round(
      linkedinActivityScore * 0.3 +
        profileUpdateScore * 0.25 +
        jobSearchSignals * 0.35 +
        responseRate * 0.1,
    );

    // ChangeReadiness updaten oder erstellen
    const changeReadiness = await this.prisma.changeReadiness.upsert({
      where: { candidateId },
      create: {
        candidateId,
        overallScore,
        linkedinActivityScore,
        profileUpdateScore,
        jobSearchSignals,
        responseRate,
        openToWork: jobSearchSignals > 70,
        activeJobSeeker: overallScore > 75,
        recentProfileChanges: profileUpdateScore > 60,
        lastCalculatedAt: new Date(),
      },
      update: {
        overallScore,
        linkedinActivityScore,
        profileUpdateScore,
        jobSearchSignals,
        responseRate,
        openToWork: jobSearchSignals > 70,
        activeJobSeeker: overallScore > 75,
        recentProfileChanges: profileUpdateScore > 60,
        lastCalculatedAt: new Date(),
      },
    });

    return changeReadiness;
  }

  /**
   * LinkedIn-Aktivität berechnen
   * - Letzte Aktivität innerhalb von 7 Tagen = hoher Score
   * - Letzte Aktivität vor 1+ Monat = niedriger Score
   */
  private calculateLinkedInActivity(candidate: Candidate): number {
    if (!candidate.lastActivity) {
      return 30; // Keine Aktivität bekannt
    }

    const daysSinceActivity = this.getDaysSince(candidate.lastActivity);

    if (daysSinceActivity <= 7) return 100;
    if (daysSinceActivity <= 14) return 85;
    if (daysSinceActivity <= 30) return 70;
    if (daysSinceActivity <= 60) return 50;
    if (daysSinceActivity <= 90) return 30;
    return 10;
  }

  /**
   * Profil-Update Score
   * - Kürzlich aktualisiertes Profil = Signal für Jobsuche
   */
  private calculateProfileUpdateScore(candidate: Candidate): number {
    if (!candidate.profileUpdatedAt) {
      return 20;
    }

    const daysSinceUpdate = this.getDaysSince(candidate.profileUpdatedAt);

    if (daysSinceUpdate <= 7) return 100;
    if (daysSinceUpdate <= 14) return 90;
    if (daysSinceUpdate <= 30) return 75;
    if (daysSinceUpdate <= 60) return 50;
    if (daysSinceUpdate <= 90) return 30;
    return 15;
  }

  /**
   * Job-Search Signals
   * - availableFrom gesetzt = will wechseln
   * - noticePeriod gesetzt = bereitet Wechsel vor
   */
  private calculateJobSearchSignals(candidate: Candidate): number {
    let score = 40; // Basis-Score

    // availableFrom gesetzt?
    if (candidate.availableFrom) {
      const daysUntilAvailable = this.getDaysUntil(candidate.availableFrom);
      if (daysUntilAvailable <= 30) {
        score += 40; // Sofort verfügbar!
      } else if (daysUntilAvailable <= 60) {
        score += 30;
      } else if (daysUntilAvailable <= 90) {
        score += 20;
      }
    }

    // noticePeriod gesetzt?
    if (candidate.noticePeriod) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  /**
   * Batch-Update: Alle Kandidaten neu berechnen
   */
  async recalculateAll(): Promise<{ updated: number }> {
    const candidates = await this.prisma.candidate.findMany({
      where: { isActive: true },
    });

    let updated = 0;
    for (const candidate of candidates) {
      await this.calculateScore(candidate.id);
      updated++;
    }

    return { updated };
  }

  /**
   * Top wechselbereite Kandidaten
   */
  async getTopChangeReady(limit: number = 50): Promise<Candidate[]> {
    return this.prisma.candidate.findMany({
      where: {
        isActive: true,
        changeReadiness: {
          overallScore: {
            gte: 70, // Mind. 70% wechselbereit
          },
        },
      },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
        changeReadiness: true,
      },
      orderBy: {
        changeReadiness: {
          overallScore: 'desc',
        },
      },
      take: limit,
    });
  }

  /**
   * Signal setzen: Kandidat ist "Open to Work"
   */
  async setOpenToWork(candidateId: string, openToWork: boolean): Promise<ChangeReadiness> {
    let changeReadiness = await this.prisma.changeReadiness.findUnique({
      where: { candidateId },
    });

    if (!changeReadiness) {
      changeReadiness = await this.calculateScore(candidateId);
    }

    return this.prisma.changeReadiness.update({
      where: { candidateId },
      data: {
        openToWork,
        jobSearchSignals: openToWork ? 100 : changeReadiness.jobSearchSignals,
      },
    });
  }

  // Helper
  private getDaysSince(date: Date): number {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private getDaysUntil(date: Date): number {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}
