import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCompanyDto, userId: string) {
    return this.prisma.company.create({
      data: dto,
    });
  }

  async findAll(teamId: string) {
    return this.prisma.company.findMany({
      where: { team_id: teamId },
      include: {
        contacts: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, teamId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        contacts: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (company.team_id !== teamId) {
      throw new ForbiddenException('Access denied to this company');
    }

    return company;
  }

  async update(id: string, dto: UpdateCompanyDto, teamId: string) {
    await this.findOne(id, teamId);

    return this.prisma.company.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, teamId: string) {
    await this.findOne(id, teamId);

    return this.prisma.company.delete({
      where: { id },
    });
  }
}
