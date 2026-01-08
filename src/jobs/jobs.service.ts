import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Job, JobStatus } from '@prisma/client';

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.JobCreateInput): Promise<Job> {
    return this.prisma.job.create({
      data,
      include: {
        requiredSkills: {
          include: {
            skill: true,
          },
        },
      },
    });
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.JobWhereInput;
    orderBy?: Prisma.JobOrderByWithRelationInput;
  }): Promise<Job[]> {
    const { skip, take, where, orderBy } = params || {};
    return this.prisma.job.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        requiredSkills: {
          include: {
            skill: true,
          },
        },
      },
    });
  }

  async findOne(id: string): Promise<Job | null> {
    return this.prisma.job.findUnique({
      where: { id },
      include: {
        requiredSkills: {
          include: {
            skill: true,
          },
        },
        matches: {
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
        },
      },
    });
  }

  async update(id: string, data: Prisma.JobUpdateInput): Promise<Job> {
    return this.prisma.job.update({
      where: { id },
      data,
      include: {
        requiredSkills: {
          include: {
            skill: true,
          },
        },
      },
    });
  }

  async delete(id: string): Promise<Job> {
    return this.prisma.job.delete({
      where: { id },
    });
  }

  // Offene Stellen
  async findOpenJobs(): Promise<Job[]> {
    return this.findAll({
      where: {
        status: JobStatus.OPEN,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Required Skill hinzufügen
  async addRequiredSkill(
    jobId: string,
    skillName: string,
    required: boolean = true,
    importance?: string,
    minYearsOfExp?: number,
  ): Promise<Job> {
    let skill = await this.prisma.skill.findUnique({
      where: { name: skillName },
    });

    if (!skill) {
      skill = await this.prisma.skill.create({
        data: { name: skillName },
      });
    }

    await this.prisma.jobSkill.upsert({
      where: {
        jobId_skillId: {
          jobId,
          skillId: skill.id,
        },
      },
      update: {
        required,
        importance: importance as any,
        minYearsOfExp,
      },
      create: {
        jobId,
        skillId: skill.id,
        required,
        importance: importance as any,
        minYearsOfExp,
      },
    });

    return this.findOne(jobId);
  }

  // Jobs nach Skills finden
  async findBySkills(skillNames: string[]): Promise<Job[]> {
    return this.prisma.job.findMany({
      where: {
        requiredSkills: {
          some: {
            skill: {
              name: {
                in: skillNames,
              },
            },
          },
        },
        status: JobStatus.OPEN,
      },
      include: {
        requiredSkills: {
          include: {
            skill: true,
          },
        },
      },
    });
  }
}
