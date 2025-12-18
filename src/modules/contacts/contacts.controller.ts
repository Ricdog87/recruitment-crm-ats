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
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER)
  @ApiOperation({ summary: 'Create a new contact' })
  @ApiResponse({ status: 201, description: 'Contact created successfully' })
  create(@Body() dto: CreateContactDto) {
    return this.contactsService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER, Role.VIEWER)
  @ApiOperation({ summary: 'Get all contacts for a team' })
  @ApiResponse({ status: 200, description: 'List of contacts' })
  findAll(@Query('team_id') teamId: string) {
    return this.contactsService.findAll(teamId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER, Role.VIEWER)
  @ApiOperation({ summary: 'Get a contact by ID' })
  @ApiResponse({ status: 200, description: 'Contact details' })
  findOne(@Param('id') id: string, @Query('team_id') teamId: string) {
    return this.contactsService.findOne(id, teamId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.RECRUITER)
  @ApiOperation({ summary: 'Update a contact' })
  @ApiResponse({ status: 200, description: 'Contact updated successfully' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
    @Query('team_id') teamId: string,
  ) {
    return this.contactsService.update(id, dto, teamId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Delete a contact' })
  @ApiResponse({ status: 200, description: 'Contact deleted successfully' })
  remove(@Param('id') id: string, @Query('team_id') teamId: string) {
    return this.contactsService.remove(id, teamId);
  }
}
