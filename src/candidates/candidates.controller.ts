import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { Candidate } from '@prisma/client';

@Controller('candidates')
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Post()
  async create(@Body() createCandidateDto: any): Promise<Candidate> {
    return this.candidatesService.create(createCandidateDto);
  }

  @Get()
  async findAll(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ): Promise<Candidate[]> {
    return this.candidatesService.findAll({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get('change-ready')
  async findChangeReady(@Query('minScore') minScore?: number): Promise<Candidate[]> {
    return this.candidatesService.findByChangeReadiness(minScore ? Number(minScore) : 70);
  }

  @Get('open-to-work')
  async findOpenToWork(): Promise<Candidate[]> {
    return this.candidatesService.findOpenToWork();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Candidate | null> {
    return this.candidatesService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateCandidateDto: any): Promise<Candidate> {
    return this.candidatesService.update(id, updateCandidateDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<Candidate> {
    return this.candidatesService.delete(id);
  }

  @Post(':id/skills')
  async addSkill(
    @Param('id') id: string,
    @Body() body: { skillName: string; level?: string; yearsOfExp?: number },
  ): Promise<Candidate> {
    return this.candidatesService.addSkill(id, body.skillName, body.level, body.yearsOfExp);
  }
}
