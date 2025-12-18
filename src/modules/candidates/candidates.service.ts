import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { ParseCvDto } from './dto/parse-cv.dto';
import { ParsingStatus, Seniority } from '@prisma/client';
import { parse } from 'csv-parse/sync';

@Injectable()
export class CandidatesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCandidateDto) {
    const existing = await this.prisma.candidate.findUnique({
      where: {
        team_id_email: {
          team_id: dto.team_id,
          email: dto.email,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Candidate with this email already exists in this team');
    }

    return this.prisma.candidate.create({
      data: {
        ...dto,
        availability_date: dto.availability_date ? new Date(dto.availability_date) : null,
      },
    });
  }

  async findAll(teamId: string) {
    return this.prisma.candidate.findMany({
      where: { team_id: teamId },
      include: {
        submissions: {
          include: {
            project: true,
          },
        },
        consent_records: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, teamId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id },
      include: {
        submissions: {
          include: {
            project: true,
          },
        },
        activities: true,
        documents: true,
        consent_records: true,
      },
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    if (candidate.team_id !== teamId) {
      throw new ForbiddenException('Access denied to this candidate');
    }

    return candidate;
  }

  async update(id: string, dto: UpdateCandidateDto, teamId: string) {
    await this.findOne(id, teamId);

    return this.prisma.candidate.update({
      where: { id },
      data: {
        ...dto,
        availability_date: dto.availability_date ? new Date(dto.availability_date) : undefined,
      },
    });
  }

  async remove(id: string, teamId: string) {
    await this.findOne(id, teamId);

    return this.prisma.candidate.delete({
      where: { id },
    });
  }

  async parseCV(id: string, dto: ParseCvDto, teamId: string) {
    const candidate = await this.findOne(id, teamId);

    await this.prisma.candidate.update({
      where: { id },
      data: { cv_parsing_status: ParsingStatus.IN_PROGRESS },
    });

    const extractedData = this.extractDataFromCV(dto.cv_text);

    return this.prisma.candidate.update({
      where: { id },
      data: {
        skills: extractedData.skills.length > 0 ? extractedData.skills : candidate.skills,
        seniority: extractedData.seniority || candidate.seniority,
        languages: extractedData.languages.length > 0 ? extractedData.languages : candidate.languages,
        cv_parsing_status: ParsingStatus.COMPLETED,
      },
    });
  }

  private extractDataFromCV(cvText: string): {
    skills: string[];
    seniority: Seniority | null;
    languages: string[];
  } {
    const text = cvText.toLowerCase();
    const skills: string[] = [];
    const languages: string[] = [];
    let seniority: Seniority | null = null;

    const skillKeywords = [
      'javascript', 'typescript', 'python', 'java', 'node.js', 'react', 'vue',
      'angular', 'nestjs', 'express', 'docker', 'kubernetes', 'aws', 'postgresql',
      'mongodb', 'redis', 'graphql', 'rest api', 'microservices', 'ci/cd', 'git',
    ];

    skillKeywords.forEach((skill) => {
      if (text.includes(skill)) {
        skills.push(skill.charAt(0).toUpperCase() + skill.slice(1));
      }
    });

    const languageKeywords = ['deutsch', 'englisch', 'french', 'spanish', 'italian'];
    languageKeywords.forEach((lang) => {
      if (text.includes(lang)) {
        languages.push(lang.charAt(0).toUpperCase() + lang.slice(1));
      }
    });

    if (text.includes('senior') || text.includes('lead')) {
      seniority = Seniority.SENIOR;
    } else if (text.includes('mid-level') || text.includes('intermediate')) {
      seniority = Seniority.MID;
    } else if (text.includes('junior') || text.includes('entry')) {
      seniority = Seniority.JUNIOR;
    }

    return { skills, seniority, languages };
  }

  async importFromCSV(csvContent: string, teamId: string) {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const results = {
      imported: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const record of records) {
      try {
        const dto: CreateCandidateDto = {
          team_id: teamId,
          first_name: record.first_name || record.firstName,
          last_name: record.last_name || record.lastName,
          email: record.email,
          phone: record.phone || undefined,
          plz: record.plz || undefined,
          skills: record.skills ? record.skills.split(',').map((s: string) => s.trim()) : [],
          seniority: record.seniority ? (record.seniority.toUpperCase() as Seniority) : undefined,
          languages: record.languages ? record.languages.split(',').map((l: string) => l.trim()) : [],
          salary_expectation: record.salary_expectation ? parseInt(record.salary_expectation) : undefined,
          availability_date: record.availability_date || undefined,
          notes: record.notes || undefined,
        };

        await this.create(dto);
        results.imported++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          record,
          error: error.message,
        });
      }
    }

    return results;
  }
}
