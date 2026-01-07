import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsArray,
  IsNumber,
} from 'class-validator';
import { WorkModel, Seniority, ProjectStatus } from '@prisma/client';

export class CreateProjectDto {
  @ApiProperty()
  @IsString()
  team_id: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  company_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plz?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  radius_km?: number;

  @ApiProperty({ enum: WorkModel })
  @IsEnum(WorkModel)
  work_model: WorkModel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  salary_min?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  salary_max?: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  must_have_skills: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nice_to_have_skills?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  required_languages?: string[];

  @ApiPropertyOptional({ enum: Seniority })
  @IsOptional()
  @IsEnum(Seniority)
  required_seniority?: Seniority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
