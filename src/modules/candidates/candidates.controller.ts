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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { CandidatesService } from './candidates.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { ParseCvDto } from './dto/parse-cv.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('candidates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('candidates')
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER)
  @ApiOperation({ summary: 'Create a new candidate' })
  @ApiResponse({ status: 201, description: 'Candidate created successfully' })
  create(@Body() dto: CreateCandidateDto) {
    return this.candidatesService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER, Role.VIEWER)
  @ApiOperation({ summary: 'Get all candidates for a team' })
  @ApiResponse({ status: 200, description: 'List of candidates' })
  findAll(@Query('team_id') teamId: string) {
    return this.candidatesService.findAll(teamId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER, Role.VIEWER)
  @ApiOperation({ summary: 'Get a candidate by ID' })
  @ApiResponse({ status: 200, description: 'Candidate details' })
  findOne(@Param('id') id: string, @Query('team_id') teamId: string) {
    return this.candidatesService.findOne(id, teamId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER)
  @ApiOperation({ summary: 'Update a candidate' })
  @ApiResponse({ status: 200, description: 'Candidate updated successfully' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCandidateDto,
    @Query('team_id') teamId: string,
  ) {
    return this.candidatesService.update(id, dto, teamId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Delete a candidate' })
  @ApiResponse({ status: 200, description: 'Candidate deleted successfully' })
  remove(@Param('id') id: string, @Query('team_id') teamId: string) {
    return this.candidatesService.remove(id, teamId);
  }

  @Post(':id/cv/parse')
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER)
  @ApiOperation({ summary: 'Parse CV and extract candidate information (stub)' })
  @ApiResponse({ status: 200, description: 'CV parsed successfully' })
  parseCV(
    @Param('id') id: string,
    @Body() dto: ParseCvDto,
    @Query('team_id') teamId: string,
  ) {
    return this.candidatesService.parseCV(id, dto, teamId);
  }

  @Post('import/csv')
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER)
  @ApiOperation({ summary: 'Import candidates from CSV file (stub)' })
  @ApiResponse({ status: 200, description: 'CSV import results' })
  async importCSV(@Body('csv_content') csvContent: string, @Query('team_id') teamId: string) {
    return this.candidatesService.importFromCSV(csvContent, teamId);
  }
}
