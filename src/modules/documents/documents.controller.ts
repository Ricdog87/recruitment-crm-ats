import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseBoolPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a document (CV, contract, etc.)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiQuery({ name: 'team_id', required: true })
  @ApiQuery({ name: 'candidate_id', required: false })
  @ApiQuery({ name: 'project_id', required: false })
  @ApiQuery({ name: 'parse_cv', required: false, type: Boolean })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
    @Query('team_id') teamId: string,
    @Query('candidate_id') candidateId?: string,
    @Query('project_id') projectId?: string,
    @Query('parse_cv', new ParseBoolPipe({ optional: true })) parseCV?: boolean,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.documentsService.uploadDocument(
      file as any,
      user.userId,
      teamId,
      candidateId,
      projectId,
      parseCV || false,
    );
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER, Role.VIEWER)
  @ApiOperation({ summary: 'Get all documents for a team' })
  @ApiQuery({ name: 'team_id', required: true })
  @ApiQuery({ name: 'candidate_id', required: false })
  @ApiQuery({ name: 'project_id', required: false })
  @ApiResponse({ status: 200, description: 'List of documents' })
  findAll(
    @Query('team_id') teamId: string,
    @Query('candidate_id') candidateId?: string,
    @Query('project_id') projectId?: string,
  ) {
    return this.documentsService.findAll(teamId, candidateId, projectId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER, Role.VIEWER)
  @ApiOperation({ summary: 'Get a specific document' })
  @ApiQuery({ name: 'team_id', required: true })
  @ApiResponse({ status: 200, description: 'Document details' })
  findOne(@Param('id') id: string, @Query('team_id') teamId: string) {
    return this.documentsService.findOne(id, teamId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER)
  @ApiOperation({ summary: 'Delete a document' })
  @ApiQuery({ name: 'team_id', required: true })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  remove(@Param('id') id: string, @Query('team_id') teamId: string) {
    return this.documentsService.remove(id, teamId);
  }
}
