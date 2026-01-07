import { ApiProperty } from '@nestjs/swagger';

export class CandidateMatchDto {
  @ApiProperty()
  candidate_id: string;

  @ApiProperty()
  candidate_name: string;

  @ApiProperty()
  candidate_email: string;

  @ApiProperty({ description: 'Match score from 0-100' })
  score: number;

  @ApiProperty({ description: 'Distance in kilometers', nullable: true })
  distance_km: number | null;

  @ApiProperty({ description: 'Short reason for the match (max 180 chars)' })
  short_reason: string;

  @ApiProperty({ description: 'Whether all hard filters passed' })
  hard_filters_passed: boolean;
}
