import { Controller, Get, Param, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MatchingService } from './matching.service';
import { CandidateMatchDto } from './dto/candidate-match.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('matching')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get(':id/matches')
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER, Role.VIEWER)
  @ApiOperation({
    summary: 'Get top matching candidates for a project',
    description: 'Returns candidates ranked by match score with distance and reasoning',
  })
  @ApiQuery({ name: 'team_id', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of matching candidates', type: [CandidateMatchDto] })
  async getMatches(
    @Param('id') projectId: string,
    @Query('team_id') teamId: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<CandidateMatchDto[]> {
    return this.matchingService.findMatchesForProject(projectId, teamId, limit);
  }
}
