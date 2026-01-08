import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Candidate, CandidateSource } from '@prisma/client';

@Injectable()
export class CandidatesService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.CandidateCreateInput): Promise<Candidate> {
    return this.prisma.candidate.create({
      data,
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
        changeReadiness: true,
      },
    });
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.CandidateWhereInput;
    orderBy?: Prisma.CandidateOrderByWithRelationInput;
  }): Promise<Candidate[]> {
    const { skip, take, where, orderBy } = params || {};
    return this.prisma.candidate.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
        changeReadiness: true,
      },
    });
  }

  async findOne(id: string): Promise<Candidate | null> {
    return this.prisma.candidate.findUnique({
      where: { id },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
        changeReadiness: true,
        matches: {
          include: {
            job: true,
          },
          orderBy: {
            overallScore: 'desc',
          },
        },
      },
    });
  }

  async update(id: string, data: Prisma.CandidateUpdateInput): Promise<Candidate> {
    return this.prisma.candidate.update({
      where: { id },
      data,
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
        changeReadiness: true,
      },
    });
  }

  async delete(id: string): Promise<Candidate> {
    return this.prisma.candidate.delete({
      where: { id },
    });
  }

  // Spezielle Abfragen für Wechselwilligkeit
  async findByChangeReadiness(minScore: number): Promise<Candidate[]> {
    return this.prisma.candidate.findMany({
      where: {
        changeReadiness: {
          overallScore: {
            gte: minScore,
          },
        },
        isActive: true,
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
    });
  }

  // Kandidaten mit "Open to Work"
  async findOpenToWork(): Promise<Candidate[]> {
    return this.prisma.candidate.findMany({
      where: {
        changeReadiness: {
          openToWork: true,
        },
        isActive: true,
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
    });
  }

  // Kandidaten mit Skills
  async findBySkills(skillNames: string[]): Promise<Candidate[]> {
    return this.prisma.candidate.findMany({
      where: {
        skills: {
          some: {
            skill: {
              name: {
                in: skillNames,
              },
            },
          },
        },
        isActive: true,
      },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
        changeReadiness: true,
      },
    });
  }

  // Skill hinzufügen
  async addSkill(
    candidateId: string,
    skillName: string,
    level?: string,
    yearsOfExp?: number,
  ): Promise<Candidate> {
    // Skill finden oder erstellen
    let skill = await this.prisma.skill.findUnique({
      where: { name: skillName },
    });

    if (!skill) {
      skill = await this.prisma.skill.create({
        data: { name: skillName },
      });
    }

    // CandidateSkill erstellen
    await this.prisma.candidateSkill.upsert({
      where: {
        candidateId_skillId: {
          candidateId,
          skillId: skill.id,
        },
      },
      update: {
        level: level as any,
        yearsOfExp,
      },
      create: {
        candidateId,
        skillId: skill.id,
        level: level as any,
        yearsOfExp,
      },
    });

    return this.findOne(candidateId);
  }

  // Letzte Aktivität aktualisieren
  async updateLastActivity(id: string, date?: Date): Promise<Candidate> {
    return this.update(id, {
      lastActivity: date || new Date(),
    });
  }
}
