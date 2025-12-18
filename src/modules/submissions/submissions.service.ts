import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';

@Injectable()
export class SubmissionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSubmissionDto) {
    const existing = await this.prisma.submission.findUnique({
      where: {
        candidate_id_project_id: {
          candidate_id: dto.candidate_id,
          project_id: dto.project_id,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Submission already exists for this candidate and project');
    }

    return this.prisma.submission.create({
      data: {
        ...dto,
        submitted_at: dto.submitted_at ? new Date(dto.submitted_at) : null,
      },
      include: {
        candidate: true,
        project: true,
      },
    });
  }

  async findAll(teamId: string, projectId?: string) {
    return this.prisma.submission.findMany({
      where: {
        team_id: teamId,
        project_id: projectId,
      },
      include: {
        candidate: true,
        project: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, teamId: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        candidate: true,
        project: true,
        activities: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.team_id !== teamId) {
      throw new ForbiddenException('Access denied to this submission');
    }

    return submission;
  }

  async update(id: string, dto: UpdateSubmissionDto, teamId: string) {
    await this.findOne(id, teamId);

    return this.prisma.submission.update({
      where: { id },
      data: {
        ...dto,
        submitted_at: dto.submitted_at ? new Date(dto.submitted_at) : undefined,
      },
      include: {
        candidate: true,
        project: true,
      },
    });
  }

  async remove(id: string, teamId: string) {
    await this.findOne(id, teamId);

    return this.prisma.submission.delete({
      where: { id },
    });
  }
}
