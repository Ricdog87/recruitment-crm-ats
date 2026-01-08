import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CandidatesService } from '../candidates/candidates.service';
import { JobsService } from '../jobs/jobs.service';
import { ChangeReadinessService } from '../change-readiness/change-readiness.service';
import { Match, Candidate, Job } from '@prisma/client';

/**
 * MATCHING ENGINE
 *
 * Diese Engine matcht Kandidaten mit Stellen basierend auf:
 * 1. Skills (Hardskills) - 35% Gewichtung
 * 2. Experience (Jahre Erfahrung) - 20% Gewichtung
 * 3. Location - 10% Gewichtung
 * 4. Salary - 10% Gewichtung
 * 5. Change Readiness (WECHSELWILLIGKEIT!) - 25% Gewichtung ⭐
 *
 * Das ist der USP: Wir priorisieren Kandidaten, die JETZT wechseln wollen!
 */
@Injectable()
export class MatchingService {
  constructor(
    private prisma: PrismaService,
    private candidatesService: CandidatesService,
    private jobsService: JobsService,
    private changeReadinessService: ChangeReadinessService,
  ) {}

  /**
   * Finde passende Kandidaten für eine Stelle
   */
  async findCandidatesForJob(jobId: string, minScore: number = 60): Promise<any[]> {
    const job = await this.jobsService.findOne(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    // Alle aktiven Kandidaten
    const candidates = await this.candidatesService.findAll({
      where: { isActive: true },
    });

    // Matches berechnen
    const matches = [];
    for (const candidate of candidates) {
      const match = await this.calculateMatch(candidate, job);
      if (match.overallScore >= minScore) {
        matches.push(match);
      }
    }

    // Sortieren nach Score
    matches.sort((a, b) => b.overallScore - a.overallScore);

    // Matches in DB speichern
    for (const match of matches) {
      await this.saveMatch(match);
    }

    return matches;
  }

  /**
   * Finde passende Stellen für einen Kandidaten
   */
  async findJobsForCandidate(candidateId: string, minScore: number = 60): Promise<any[]> {
    const candidate = await this.candidatesService.findOne(candidateId);
    if (!candidate) {
      throw new Error('Candidate not found');
    }

    // Alle offenen Stellen
    const jobs = await this.jobsService.findOpenJobs();

    // Matches berechnen
    const matches = [];
    for (const job of jobs) {
      const match = await this.calculateMatch(candidate, job);
      if (match.overallScore >= minScore) {
        matches.push(match);
      }
    }

    // Sortieren nach Score
    matches.sort((a, b) => b.overallScore - a.overallScore);

    // Matches in DB speichern
    for (const match of matches) {
      await this.saveMatch(match);
    }

    return matches;
  }

  /**
   * MATCHING-ALGORITHMUS
   */
  private async calculateMatch(candidate: any, job: any): Promise<any> {
    // Skills-Matching
    const skillsScore = this.calculateSkillsScore(candidate, job);

    // Experience-Matching
    const experienceScore = this.calculateExperienceScore(candidate, job);

    // Location-Matching
    const locationScore = this.calculateLocationScore(candidate, job);

    // Salary-Matching
    const salaryScore = this.calculateSalaryScore(candidate, job);

    // Change Readiness (WICHTIG!)
    const changeReadinessScore = candidate.changeReadiness?.overallScore || 50;

    // Gewichteter Gesamt-Score
    const overallScore = Math.round(
      skillsScore * 0.35 +
        experienceScore * 0.2 +
        locationScore * 0.1 +
        salaryScore * 0.1 +
        changeReadinessScore * 0.25, // WECHSELWILLIGKEIT = 25%!
    );

    // Matching Skills & Missing Skills
    const matchingSkills = this.getMatchingSkills(candidate, job);
    const missingSkills = this.getMissingSkills(candidate, job);

    return {
      candidateId: candidate.id,
      jobId: job.id,
      candidate,
      job,
      overallScore,
      skillsScore,
      experienceScore,
      locationScore,
      salaryScore,
      changeReadinessScore,
      matchingSkills,
      missingSkills,
    };
  }

  /**
   * Skills-Score berechnen
   * - Wie viele Required Skills hat der Kandidat?
   * - Wie gut ist das Skill-Level?
   */
  private calculateSkillsScore(candidate: any, job: any): number {
    const requiredSkills = job.requiredSkills || [];
    const candidateSkills = candidate.skills || [];

    if (requiredSkills.length === 0) return 70; // Kein Skill-Requirement

    const candidateSkillNames = candidateSkills.map((cs: any) => cs.skill.name.toLowerCase());

    let matchedCount = 0;
    let totalImportance = 0;
    let matchedImportance = 0;

    for (const jobSkill of requiredSkills) {
      const skillName = jobSkill.skill.name.toLowerCase();
      const importance = jobSkill.importance === 'HIGH' ? 3 : jobSkill.importance === 'MEDIUM' ? 2 : 1;

      totalImportance += importance;

      if (candidateSkillNames.includes(skillName)) {
        matchedCount++;
        matchedImportance += importance;
      }
    }

    // Score basierend auf gewichteten Matches
    const score = (matchedImportance / totalImportance) * 100;
    return Math.round(score);
  }

  /**
   * Experience-Score
   */
  private calculateExperienceScore(candidate: any, job: any): number {
    const candidateExp = candidate.experienceYears || 0;

    // Heuristik: Mind. 2 Jahre für Junior, 5 Jahre für Senior
    if (job.title?.toLowerCase().includes('senior') || job.title?.toLowerCase().includes('lead')) {
      if (candidateExp >= 5) return 100;
      if (candidateExp >= 3) return 70;
      return 40;
    }

    if (job.title?.toLowerCase().includes('junior')) {
      if (candidateExp <= 3) return 100;
      if (candidateExp <= 5) return 80;
      return 60;
    }

    // Mid-Level
    if (candidateExp >= 2) return 80;
    return 50;
  }

  /**
   * Location-Score
   */
  private calculateLocationScore(candidate: any, job: any): number {
    if (!candidate.location || !job.location) return 70; // Unknown

    const candidateLoc = candidate.location.toLowerCase();
    const jobLoc = job.location.toLowerCase();

    if (candidateLoc === jobLoc) return 100;
    if (candidateLoc.includes(jobLoc) || jobLoc.includes(candidateLoc)) return 80;

    // Remote?
    if (jobLoc.includes('remote')) return 90;

    return 50;
  }

  /**
   * Salary-Score
   */
  private calculateSalaryScore(candidate: any, job: any): number {
    if (!candidate.desiredSalary || !job.salaryMax) return 70;

    const desired = Number(candidate.desiredSalary);
    const offered = Number(job.salaryMax);

    if (offered >= desired) return 100;
    if (offered >= desired * 0.9) return 85;
    if (offered >= desired * 0.8) return 70;
    if (offered >= desired * 0.7) return 50;
    return 30;
  }

  /**
   * Welche Skills matchen?
   */
  private getMatchingSkills(candidate: any, job: any): string[] {
    const requiredSkills = job.requiredSkills || [];
    const candidateSkills = candidate.skills || [];

    const candidateSkillNames = candidateSkills.map((cs: any) => cs.skill.name.toLowerCase());
    const matching = [];

    for (const jobSkill of requiredSkills) {
      const skillName = jobSkill.skill.name;
      if (candidateSkillNames.includes(skillName.toLowerCase())) {
        matching.push(skillName);
      }
    }

    return matching;
  }

  /**
   * Welche Skills fehlen?
   */
  private getMissingSkills(candidate: any, job: any): string[] {
    const requiredSkills = job.requiredSkills || [];
    const candidateSkills = candidate.skills || [];

    const candidateSkillNames = candidateSkills.map((cs: any) => cs.skill.name.toLowerCase());
    const missing = [];

    for (const jobSkill of requiredSkills) {
      const skillName = jobSkill.skill.name;
      if (!candidateSkillNames.includes(skillName.toLowerCase()) && jobSkill.required) {
        missing.push(skillName);
      }
    }

    return missing;
  }

  /**
   * Match in DB speichern
   */
  private async saveMatch(matchData: any): Promise<Match> {
    return this.prisma.match.upsert({
      where: {
        candidateId_jobId: {
          candidateId: matchData.candidateId,
          jobId: matchData.jobId,
        },
      },
      create: {
        candidateId: matchData.candidateId,
        jobId: matchData.jobId,
        overallScore: matchData.overallScore,
        skillsScore: matchData.skillsScore,
        experienceScore: matchData.experienceScore,
        locationScore: matchData.locationScore,
        salaryScore: matchData.salaryScore,
        changeReadinessScore: matchData.changeReadinessScore,
        matchingSkills: matchData.matchingSkills,
        missingSkills: matchData.missingSkills,
      },
      update: {
        overallScore: matchData.overallScore,
        skillsScore: matchData.skillsScore,
        experienceScore: matchData.experienceScore,
        locationScore: matchData.locationScore,
        salaryScore: matchData.salaryScore,
        changeReadinessScore: matchData.changeReadinessScore,
        matchingSkills: matchData.matchingSkills,
        missingSkills: matchData.missingSkills,
      },
    });
  }

  /**
   * Top Matches für Job holen
   */
  async getTopMatchesForJob(jobId: string, limit: number = 20): Promise<Match[]> {
    return this.prisma.match.findMany({
      where: { jobId },
      include: {
        candidate: {
          include: {
            skills: {
              include: {
                skill: true,
              },
            },
            changeReadiness: true,
          },
        },
      },
      orderBy: {
        overallScore: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Top Matches für Kandidat holen
   */
  async getTopMatchesForCandidate(candidateId: string, limit: number = 20): Promise<Match[]> {
    return this.prisma.match.findMany({
      where: { candidateId },
      include: {
        job: {
          include: {
            requiredSkills: {
              include: {
                skill: true,
              },
            },
          },
        },
      },
      orderBy: {
        overallScore: 'desc',
      },
      take: limit,
    });
  }
}
