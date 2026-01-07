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
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('submissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER)
  @ApiOperation({ summary: 'Create a new submission' })
  @ApiResponse({ status: 201, description: 'Submission created successfully' })
  create(@Body() dto: CreateSubmissionDto) {
    return this.submissionsService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER, Role.VIEWER)
  @ApiOperation({ summary: 'Get all submissions for a team or project' })
  @ApiResponse({ status: 200, description: 'List of submissions' })
  findAll(@Query('team_id') teamId: string, @Query('project_id') projectId?: string) {
    return this.submissionsService.findAll(teamId, projectId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER, Role.VIEWER)
  @ApiOperation({ summary: 'Get a submission by ID' })
  @ApiResponse({ status: 200, description: 'Submission details' })
  findOne(@Param('id') id: string, @Query('team_id') teamId: string) {
    return this.submissionsService.findOne(id, teamId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER)
  @ApiOperation({ summary: 'Update a submission' })
  @ApiResponse({ status: 200, description: 'Submission updated successfully' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSubmissionDto,
    @Query('team_id') teamId: string,
  ) {
    return this.submissionsService.update(id, dto, teamId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Delete a submission' })
  @ApiResponse({ status: 200, description: 'Submission deleted successfully' })
  remove(@Param('id') id: string, @Query('team_id') teamId: string) {
    return this.submissionsService.remove(id, teamId);
  }
}
