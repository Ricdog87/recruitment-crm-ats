import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { CVParsingService } from '../cv-parsing/cv-parsing.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { ParseCvDto } from './dto/parse-cv.dto';
import { ParsingStatus, Seniority, WorkflowTriggerType } from '@prisma/client';
import { parse } from 'csv-parse/sync';

@Injectable()
export class CandidatesService {
  constructor(
    private prisma: PrismaService,
    private cvParsingService: CVParsingService,
    private eventEmitter: EventEmitter2,
  ) {}

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

    const candidate = await this.prisma.candidate.create({
      data: {
        ...dto,
        availability_date: dto.availability_date ? new Date(dto.availability_date) : null,
      },
    });

    // Emit event for workflow automation
    this.eventEmitter.emit('candidate.created', {
      type: WorkflowTriggerType.CANDIDATE_CREATED,
      teamId: candidate.team_id,
      data: candidate,
      metadata: { candidateId: candidate.id },
    });

    return candidate;
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

  /**
   * Parse CV text and extract candidate data using AI
   */
  async parseCV(id: string, dto: ParseCvDto, teamId: string) {
    await this.findOne(id, teamId); // Validate access

    // Use the CV parsing service (with OpenAI integration)
    await this.cvParsingService.parseCVForCandidate(id, dto.cv_text, teamId);

    // Return updated candidate
    return this.findOne(id, teamId);
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
