import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER, Role.VIEWER)
  @ApiOperation({ summary: 'Get comprehensive dashboard KPIs and metrics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard analytics data including KPIs, pipeline, and revenue',
  })
  getDashboardKPIs(@Query('team_id') teamId: string) {
    return this.analyticsService.getDashboardKPIs(teamId);
  }

  @Get('projects/:id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER, Role.VIEWER)
  @ApiOperation({ summary: 'Get detailed analytics for a specific project' })
  @ApiResponse({
    status: 200,
    description: 'Project analytics with submission breakdown and top candidates',
  })
  getProjectAnalytics(@Param('id') projectId: string, @Query('team_id') teamId: string) {
    return this.analyticsService.getProjectAnalytics(projectId, teamId);
  }
}
