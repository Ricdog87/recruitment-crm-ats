import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { WorkModel, Seniority, ProjectStatus } from '@prisma/client';

describe('Matching E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let teamId: string;
  let projectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get(PrismaService);

    if (process.env.NODE_ENV !== 'test') {
      await prisma.cleanDatabase();
    }

    const authResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'matching@example.com',
        password: 'password123',
        first_name: 'Matching',
        last_name: 'Test',
      });

    accessToken = authResponse.body.access_token;
    const userId = authResponse.body.user.id;

    const team = await prisma.team.create({
      data: { name: 'Test Team' },
    });
    teamId = team.id;

    await prisma.teamMember.create({
      data: {
        team_id: teamId,
        user_id: userId,
        role: 'ADMIN',
      },
    });

    await prisma.plzGeodata.createMany({
      data: [
        { plz: '10115', city: 'Berlin', latitude: 52.531677, longitude: 13.3888599 },
        { plz: '10117', city: 'Berlin Mitte', latitude: 52.520007, longitude: 13.404954 },
      ],
    });

    const project = await prisma.project.create({
      data: {
        team_id: teamId,
        title: 'Backend Developer',
        status: ProjectStatus.ACTIVE,
        work_model: WorkModel.REMOTE,
        must_have_skills: ['Node.js', 'TypeScript'],
        nice_to_have_skills: ['NestJS', 'Docker'],
        required_languages: ['Englisch'],
        salary_min: 60000,
        salary_max: 80000,
        required_seniority: Seniority.MID,
      },
    });
    projectId = project.id;

    await prisma.candidate.createMany({
      data: [
        {
          team_id: teamId,
          first_name: 'Alice',
          last_name: 'Johnson',
          email: 'alice@example.com',
          plz: '10115',
          skills: ['Node.js', 'TypeScript', 'NestJS', 'Docker'],
          seniority: Seniority.MID,
          languages: ['Englisch', 'Deutsch'],
          salary_expectation: 65000,
        },
        {
          team_id: teamId,
          first_name: 'Bob',
          last_name: 'Smith',
          email: 'bob@example.com',
          plz: '10117',
          skills: ['Node.js', 'JavaScript'],
          seniority: Seniority.JUNIOR,
          languages: ['Englisch'],
          salary_expectation: 45000,
        },
        {
          team_id: teamId,
          first_name: 'Charlie',
          last_name: 'Brown',
          email: 'charlie@example.com',
          skills: ['Python', 'Django'],
          seniority: Seniority.SENIOR,
          languages: ['Englisch'],
          salary_expectation: 85000,
        },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/projects/:id/matches', () => {
    it('should return matching candidates sorted by score', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/projects/${projectId}/matches`)
        .query({ team_id: teamId })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const firstMatch = response.body[0];
      expect(firstMatch).toHaveProperty('candidate_id');
      expect(firstMatch).toHaveProperty('candidate_name');
      expect(firstMatch).toHaveProperty('score');
      expect(firstMatch).toHaveProperty('distance_km');
      expect(firstMatch).toHaveProperty('short_reason');
      expect(firstMatch).toHaveProperty('hard_filters_passed');

      expect(firstMatch.candidate_name).toBe('Alice Johnson');
      expect(firstMatch.score).toBeGreaterThan(response.body[1]?.score || 0);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/projects/${projectId}/matches`)
        .query({ team_id: teamId, limit: 1 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/projects/${projectId}/matches`)
        .query({ team_id: teamId })
        .expect(401);
    });

    it('should fail without team_id', async () => {
      await request(app.getHttpServer())
        .get(`/api/projects/${projectId}/matches`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });
});
