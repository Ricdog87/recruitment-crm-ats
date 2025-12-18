import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class ParseCvDto {
  @ApiProperty({ description: 'Raw CV text content or file metadata' })
  @IsString()
  cv_text: string;

  @ApiPropertyOptional({ description: 'Original filename if uploaded' })
  @IsOptional()
  @IsString()
  file_name?: string;
}
