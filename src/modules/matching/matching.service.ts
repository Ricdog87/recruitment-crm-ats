import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlzService } from '../plz/plz.service';
import { WorkModel, Seniority, Candidate, Project } from '@prisma/client';
import { CandidateMatchDto } from './dto/candidate-match.dto';

@Injectable()
export class MatchingService {
  constructor(
    private prisma: PrismaService,
    private plzService: PlzService,
  ) {}

  async findMatchesForProject(
    projectId: string,
    teamId: string,
    limit: number = 10,
  ): Promise<CandidateMatchDto[]> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.team_id !== teamId) {
      throw new Error('Project not found or access denied');
    }

    const candidates = await this.prisma.candidate.findMany({
      where: { team_id: teamId },
    });

    const matches: CandidateMatchDto[] = [];

    for (const candidate of candidates) {
      const matchResult = await this.calculateMatch(project, candidate);

      if (matchResult.hard_filters_passed || matchResult.score >= 30) {
        matches.push({
          candidate_id: candidate.id,
          candidate_name: `${candidate.first_name} ${candidate.last_name}`,
          candidate_email: candidate.email,
          score: matchResult.score,
          distance_km: matchResult.distance_km,
          short_reason: matchResult.short_reason,
          hard_filters_passed: matchResult.hard_filters_passed,
        });
      }
    }

    matches.sort((a, b) => b.score - a.score);

    return matches.slice(0, limit);
  }

  private async calculateMatch(
    project: Project,
    candidate: Candidate,
  ): Promise<{
    score: number;
    distance_km: number | null;
    short_reason: string;
    hard_filters_passed: boolean;
  }> {
    let score = 0;
    const reasons: string[] = [];
    let hard_filters_passed = true;
    let distance_km: number | null = null;

    if (project.plz && candidate.plz) {
      distance_km = await this.plzService.calculateDistance(project.plz, candidate.plz);
    }

    if (project.work_model === WorkModel.ONSITE || project.work_model === WorkModel.HYBRID) {
      if (project.radius_km && distance_km !== null) {
        if (distance_km > project.radius_km) {
          hard_filters_passed = false;
        } else {
          const distanceScore = Math.max(0, 10 - (distance_km / project.radius_km) * 10);
          score += distanceScore;
          if (distance_km <= project.radius_km / 2) {
            reasons.push(`${distance_km}km`);
          }
        }
      }
    } else if (project.work_model === WorkModel.REMOTE) {
      score += 10;
    }

    const mustHaveSkills = project.must_have_skills || [];
    const candidateSkills = candidate.skills || [];
    const candidateSkillsLower = candidateSkills.map((s) => s.toLowerCase());

    if (mustHaveSkills.length > 0) {
      const matchedMustHave = mustHaveSkills.filter((skill) =>
        candidateSkillsLower.some((cs) => cs.includes(skill.toLowerCase()) || skill.toLowerCase().includes(cs)),
      );

      const mustHaveCoverage = matchedMustHave.length / mustHaveSkills.length;

      if (mustHaveCoverage < 0.5) {
        hard_filters_passed = false;
      }

      score += mustHaveCoverage * 50;
      reasons.push(`${matchedMustHave.length}/${mustHaveSkills.length} Must-Skills`);
    }

    const niceToHaveSkills = project.nice_to_have_skills || [];
    if (niceToHaveSkills.length > 0) {
      const matchedNiceToHave = niceToHaveSkills.filter((skill) =>
        candidateSkillsLower.some((cs) => cs.includes(skill.toLowerCase()) || skill.toLowerCase().includes(cs)),
      );

      const niceToHaveCoverage = matchedNiceToHave.length / niceToHaveSkills.length;
      score += niceToHaveCoverage * 20;

      if (matchedNiceToHave.length > 0) {
        reasons.push(`+${matchedNiceToHave.length} Nice-Skills`);
      }
    }

    if (project.required_seniority && candidate.seniority) {
      const seniorityMatch = this.calculateSeniorityMatch(
        project.required_seniority,
        candidate.seniority,
      );
      score += seniorityMatch;

      if (seniorityMatch >= 8) {
        reasons.push('Seniority✓');
      }
    } else if (candidate.seniority) {
      score += 5;
    }

    const requiredLanguages = project.required_languages || [];
    const candidateLanguages = candidate.languages || [];
    const candidateLanguagesLower = candidateLanguages.map((l) => l.toLowerCase());

    if (requiredLanguages.length > 0) {
      const matchedLanguages = requiredLanguages.filter((lang) =>
        candidateLanguagesLower.some((cl) => cl.includes(lang.toLowerCase()) || lang.toLowerCase().includes(cl)),
      );

      if (matchedLanguages.length < requiredLanguages.length) {
        hard_filters_passed = false;
      } else {
        reasons.push('Languages✓');
      }
    }

    if (project.salary_min && candidate.salary_expectation) {
      if (candidate.salary_expectation < project.salary_min * 0.8) {
        score += 5;
      } else if (
        candidate.salary_expectation >= project.salary_min &&
        (!project.salary_max || candidate.salary_expectation <= project.salary_max)
      ) {
        score += 10;
        reasons.push('Salary✓');
      } else if (project.salary_max && candidate.salary_expectation > project.salary_max * 1.2) {
        score -= 5;
      }
    }

    const short_reason = reasons.slice(0, 3).join(', ') || 'Basic match';

    return {
      score: Math.round(Math.min(100, Math.max(0, score))),
      distance_km,
      short_reason: short_reason.substring(0, 180),
      hard_filters_passed,
    };
  }

  private calculateSeniorityMatch(required: Seniority, candidate: Seniority): number {
    const seniorityLevels: Record<Seniority, number> = {
      [Seniority.JUNIOR]: 1,
      [Seniority.MID]: 2,
      [Seniority.SENIOR]: 3,
      [Seniority.LEAD]: 4,
    };

    const requiredLevel = seniorityLevels[required];
    const candidateLevel = seniorityLevels[candidate];

    if (candidateLevel === requiredLevel) {
      return 10;
    } else if (candidateLevel === requiredLevel - 1 || candidateLevel === requiredLevel + 1) {
      return 8;
    } else if (candidateLevel === requiredLevel - 2 || candidateLevel === requiredLevel + 2) {
      return 5;
    }

    return 0;
  }
}
