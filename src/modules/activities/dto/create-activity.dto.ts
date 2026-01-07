import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ActivityType } from '@prisma/client';

export class CreateActivityDto {
  @ApiProperty()
  @IsString()
  team_id: string;

  @ApiProperty()
  @IsString()
  user_id: string;

  @ApiProperty({ enum: ActivityType })
  @IsEnum(ActivityType)
  type: ActivityType;

  @ApiProperty()
  @IsString()
  subject: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contact_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  project_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  candidate_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  submission_id?: string;
}
