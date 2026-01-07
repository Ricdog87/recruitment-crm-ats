import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchingService } from './matching.service';
import { PrismaService } from '../prisma/prisma.service';
import { PlzService } from '../plz/plz.service';
import { WorkModel, Seniority, ProjectStatus } from '@prisma/client';

describe('MatchingService', () => {
  let service: MatchingService;
  let prismaService: PrismaService;
  let plzService: PlzService;

  beforeEach(() => {
    prismaService = {
      project: {
        findUnique: vi.fn(),
      },
      candidate: {
        findMany: vi.fn(),
      },
    } as any;

    plzService = {
      calculateDistance: vi.fn(),
    } as any;

    service = new MatchingService(prismaService, plzService);
  });

  describe('findMatchesForProject', () => {
    it('should return empty array when no candidates match', async () => {
      const project = {
        id: 'project1',
        team_id: 'team1',
        title: 'Senior Developer',
        status: ProjectStatus.ACTIVE,
        work_model: WorkModel.REMOTE,
        must_have_skills: ['Node.js', 'TypeScript'],
        nice_to_have_skills: [],
        required_languages: [],
        salary_min: 70000,
        salary_max: 90000,
        plz: null,
        radius_km: null,
        required_seniority: Seniority.SENIOR,
        company_name: null,
        description: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const candidates = [
        {
          id: 'candidate1',
          team_id: 'team1',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: null,
          plz: null,
          skills: ['Python', 'Java'],
          seniority: Seniority.JUNIOR,
          languages: ['Englisch'],
          salary_expectation: 50000,
          availability_date: null,
          notes: null,
          cv_parsing_status: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      vi.spyOn(prismaService.project, 'findUnique').mockResolvedValue(project);
      vi.spyOn(prismaService.candidate, 'findMany').mockResolvedValue(candidates);

      const result = await service.findMatchesForProject('project1', 'team1', 10);

      expect(result).toEqual([]);
    });

    it('should return candidates sorted by score', async () => {
      const project = {
        id: 'project1',
        team_id: 'team1',
        title: 'Backend Developer',
        status: ProjectStatus.ACTIVE,
        work_model: WorkModel.REMOTE,
        must_have_skills: ['Node.js', 'TypeScript'],
        nice_to_have_skills: ['NestJS'],
        required_languages: ['Englisch'],
        salary_min: 60000,
        salary_max: 80000,
        plz: null,
        radius_km: null,
        required_seniority: Seniority.MID,
        company_name: null,
        description: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const candidates = [
        {
          id: 'candidate1',
          team_id: 'team1',
          first_name: 'Alice',
          last_name: 'Smith',
          email: 'alice@example.com',
          phone: null,
          plz: null,
          skills: ['Node.js', 'TypeScript', 'NestJS'],
          seniority: Seniority.MID,
          languages: ['Englisch', 'Deutsch'],
          salary_expectation: 65000,
          availability_date: null,
          notes: null,
          cv_parsing_status: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'candidate2',
          team_id: 'team1',
          first_name: 'Bob',
          last_name: 'Jones',
          email: 'bob@example.com',
          phone: null,
          plz: null,
          skills: ['Node.js'],
          seniority: Seniority.JUNIOR,
          languages: ['Englisch'],
          salary_expectation: 55000,
          availability_date: null,
          notes: null,
          cv_parsing_status: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      vi.spyOn(prismaService.project, 'findUnique').mockResolvedValue(project);
      vi.spyOn(prismaService.candidate, 'findMany').mockResolvedValue(candidates);

      const result = await service.findMatchesForProject('project1', 'team1', 10);

      expect(result).toHaveLength(2);
      expect(result[0].candidate_id).toBe('candidate1');
      expect(result[0].score).toBeGreaterThan(result[1].score);
      expect(result[0].hard_filters_passed).toBe(true);
    });

    it('should filter out candidates beyond radius', async () => {
      const project = {
        id: 'project1',
        team_id: 'team1',
        title: 'Onsite Developer',
        status: ProjectStatus.ACTIVE,
        work_model: WorkModel.ONSITE,
        must_have_skills: ['JavaScript'],
        nice_to_have_skills: [],
        required_languages: [],
        salary_min: null,
        salary_max: null,
        plz: '10115',
        radius_km: 20,
        required_seniority: null,
        company_name: null,
        description: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const candidates = [
        {
          id: 'candidate1',
          team_id: 'team1',
          first_name: 'Charlie',
          last_name: 'Brown',
          email: 'charlie@example.com',
          phone: null,
          plz: '10115',
          skills: ['JavaScript', 'React'],
          seniority: null,
          languages: [],
          salary_expectation: null,
          availability_date: null,
          notes: null,
          cv_parsing_status: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      vi.spyOn(prismaService.project, 'findUnique').mockResolvedValue(project);
      vi.spyOn(prismaService.candidate, 'findMany').mockResolvedValue(candidates);
      vi.spyOn(plzService, 'calculateDistance').mockResolvedValue(5);

      const result = await service.findMatchesForProject('project1', 'team1', 10);

      expect(result).toHaveLength(1);
      expect(result[0].distance_km).toBe(5);
      expect(result[0].hard_filters_passed).toBe(true);
    });
  });
});
