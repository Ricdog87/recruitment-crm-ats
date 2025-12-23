import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create a new workflow automation' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  create(@Body() createWorkflowDto: CreateWorkflowDto, @Query('team_id') teamId: string) {
    return this.workflowsService.create(createWorkflowDto, teamId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER)
  @ApiOperation({ summary: 'Get all workflows for a team' })
  @ApiResponse({ status: 200, description: 'List of workflows' })
  findAll(@Query('team_id') teamId: string) {
    return this.workflowsService.findAll(teamId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER)
  @ApiOperation({ summary: 'Get a specific workflow with execution logs' })
  @ApiResponse({ status: 200, description: 'Workflow details' })
  findOne(@Param('id') id: string, @Query('team_id') teamId: string) {
    return this.workflowsService.findOne(id, teamId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated successfully' })
  update(
    @Param('id') id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto,
    @Query('team_id') teamId: string,
  ) {
    return this.workflowsService.update(id, updateWorkflowDto, teamId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Delete a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow deleted successfully' })
  remove(@Param('id') id: string, @Query('team_id') teamId: string) {
    return this.workflowsService.remove(id, teamId);
  }
}
