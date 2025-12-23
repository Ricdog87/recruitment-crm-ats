import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';

@Injectable()
export class WorkflowsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkflowDto, teamId: string) {
    return this.prisma.workflow.create({
      data: {
        ...dto,
        team_id: teamId,
      },
    });
  }

  async findAll(teamId: string) {
    return this.prisma.workflow.findMany({
      where: { team_id: teamId },
      include: {
        _count: {
          select: { logs: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, teamId: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: { executed_at: 'desc' },
          take: 50,
        },
      },
    });

    if (!workflow || workflow.team_id !== teamId) {
      throw new NotFoundException('Workflow not found');
    }

    return workflow;
  }

  async update(id: string, dto: UpdateWorkflowDto, teamId: string) {
    await this.findOne(id, teamId);

    return this.prisma.workflow.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, teamId: string) {
    await this.findOne(id, teamId);

    return this.prisma.workflow.delete({
      where: { id },
    });
  }
}
