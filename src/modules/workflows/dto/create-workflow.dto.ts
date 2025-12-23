import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsEnum, IsOptional, IsObject, IsArray } from 'class-validator';
import { WorkflowTriggerType } from '@prisma/client';

export class CreateWorkflowDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: WorkflowTriggerType })
  @IsEnum(WorkflowTriggerType)
  trigger_type: WorkflowTriggerType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  trigger_config?: any;

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  @IsArray()
  actions: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
