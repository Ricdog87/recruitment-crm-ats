import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { SubmissionStatus } from '@prisma/client';

export class CreateSubmissionDto {
  @ApiProperty()
  @IsString()
  team_id: string;

  @ApiProperty()
  @IsString()
  candidate_id: string;

  @ApiProperty()
  @IsString()
  project_id: string;

  @ApiPropertyOptional({ enum: SubmissionStatus })
  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  submitted_at?: string;
}
