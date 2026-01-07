import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateActivityDto) {
    return this.prisma.activity.create({
      data: dto,
      include: {
        user: true,
        contact: true,
        project: true,
        candidate: true,
        submission: true,
      },
    });
  }

  async findAll(teamId: string, filters?: { contact_id?: string; project_id?: string; candidate_id?: string; submission_id?: string }) {
    return this.prisma.activity.findMany({
      where: {
        team_id: teamId,
        ...filters,
      },
      include: {
        user: true,
        contact: true,
        project: true,
        candidate: true,
        submission: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, teamId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id },
      include: {
        user: true,
        contact: true,
        project: true,
        candidate: true,
        submission: true,
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    if (activity.team_id !== teamId) {
      throw new ForbiddenException('Access denied to this activity');
    }

    return activity;
  }

  async update(id: string, dto: UpdateActivityDto, teamId: string) {
    await this.findOne(id, teamId);

    return this.prisma.activity.update({
      where: { id },
      data: dto,
      include: {
        user: true,
      },
    });
  }

  async remove(id: string, teamId: string) {
    await this.findOne(id, teamId);

    return this.prisma.activity.delete({
      where: { id },
    });
  }
}
