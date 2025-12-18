import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: dto,
    });
  }

  async findAll(teamId: string) {
    return this.prisma.project.findMany({
      where: { team_id: teamId },
      include: {
        submissions: {
          include: {
            candidate: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, teamId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        submissions: {
          include: {
            candidate: true,
          },
        },
        activities: true,
        documents: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.team_id !== teamId) {
      throw new ForbiddenException('Access denied to this project');
    }

    return project;
  }

  async update(id: string, dto: UpdateProjectDto, teamId: string) {
    await this.findOne(id, teamId);

    return this.prisma.project.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, teamId: string) {
    await this.findOne(id, teamId);

    return this.prisma.project.delete({
      where: { id },
    });
  }
}
