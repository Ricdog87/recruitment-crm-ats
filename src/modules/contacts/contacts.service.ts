import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateContactDto) {
    return this.prisma.contact.create({
      data: dto,
      include: { company: true },
    });
  }

  async findAll(teamId: string) {
    return this.prisma.contact.findMany({
      where: { team_id: teamId },
      include: { company: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, teamId: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: { company: true, activities: true },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    if (contact.team_id !== teamId) {
      throw new ForbiddenException('Access denied to this contact');
    }

    return contact;
  }

  async update(id: string, dto: UpdateContactDto, teamId: string) {
    await this.findOne(id, teamId);

    return this.prisma.contact.update({
      where: { id },
      data: dto,
      include: { company: true },
    });
  }

  async remove(id: string, teamId: string) {
    await this.findOne(id, teamId);

    return this.prisma.contact.delete({
      where: { id },
    });
  }
}
