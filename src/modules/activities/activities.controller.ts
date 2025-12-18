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
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER)
  @ApiOperation({ summary: 'Create a new activity' })
  @ApiResponse({ status: 201, description: 'Activity created successfully' })
  create(@Body() dto: CreateActivityDto) {
    return this.activitiesService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER, Role.VIEWER)
  @ApiOperation({ summary: 'Get all activities for a team' })
  @ApiResponse({ status: 200, description: 'List of activities' })
  findAll(
    @Query('team_id') teamId: string,
    @Query('contact_id') contactId?: string,
    @Query('project_id') projectId?: string,
    @Query('candidate_id') candidateId?: string,
    @Query('submission_id') submissionId?: string,
  ) {
    return this.activitiesService.findAll(teamId, {
      contact_id: contactId,
      project_id: projectId,
      candidate_id: candidateId,
      submission_id: submissionId,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER, Role.VIEWER)
  @ApiOperation({ summary: 'Get an activity by ID' })
  @ApiResponse({ status: 200, description: 'Activity details' })
  findOne(@Param('id') id: string, @Query('team_id') teamId: string) {
    return this.activitiesService.findOne(id, teamId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER)
  @ApiOperation({ summary: 'Update an activity' })
  @ApiResponse({ status: 200, description: 'Activity updated successfully' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
    @Query('team_id') teamId: string,
  ) {
    return this.activitiesService.update(id, dto, teamId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Delete an activity' })
  @ApiResponse({ status: 200, description: 'Activity deleted successfully' })
  remove(@Param('id') id: string, @Query('team_id') teamId: string) {
    return this.activitiesService.remove(id, teamId);
  }
}
