import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER)
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER, Role.VIEWER)
  @ApiOperation({ summary: 'Get all projects for a team' })
  @ApiResponse({ status: 200, description: 'List of projects' })
  findAll(@Query('team_id') teamId: string) {
    return this.projectsService.findAll(teamId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER, Role.VIEWER)
  @ApiOperation({ summary: 'Get a project by ID' })
  @ApiResponse({ status: 200, description: 'Project details' })
  findOne(@Param('id') id: string, @Query('team_id') teamId: string) {
    return this.projectsService.findOne(id, teamId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER)
  @ApiOperation({ summary: 'Update a project' })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @Query('team_id') teamId: string,
  ) {
    return this.projectsService.update(id, dto, teamId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Delete a project' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully' })
  remove(@Param('id') id: string, @Query('team_id') teamId: string) {
    return this.projectsService.remove(id, teamId);
  }
}
