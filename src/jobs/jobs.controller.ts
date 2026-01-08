import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { Job } from '@prisma/client';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  async create(@Body() createJobDto: any): Promise<Job> {
    return this.jobsService.create(createJobDto);
  }

  @Get()
  async findAll(@Query('skip') skip?: number, @Query('take') take?: number): Promise<Job[]> {
    return this.jobsService.findAll({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get('open')
  async findOpenJobs(): Promise<Job[]> {
    return this.jobsService.findOpenJobs();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Job | null> {
    return this.jobsService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateJobDto: any): Promise<Job> {
    return this.jobsService.update(id, updateJobDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<Job> {
    return this.jobsService.delete(id);
  }

  @Post(':id/skills')
  async addSkill(
    @Param('id') id: string,
    @Body()
    body: {
      skillName: string;
      required?: boolean;
      importance?: string;
      minYearsOfExp?: number;
    },
  ): Promise<Job> {
    return this.jobsService.addRequiredSkill(
      id,
      body.skillName,
      body.required,
      body.importance,
      body.minYearsOfExp,
    );
  }
}
