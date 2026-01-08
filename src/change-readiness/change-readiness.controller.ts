import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ChangeReadinessService } from './change-readiness.service';

@Controller('change-readiness')
export class ChangeReadinessController {
  constructor(private readonly service: ChangeReadinessService) {}

  @Post(':candidateId/calculate')
  async calculate(@Param('candidateId') candidateId: string) {
    return this.service.calculateScore(candidateId);
  }

  @Post('recalculate-all')
  async recalculateAll() {
    return this.service.recalculateAll();
  }

  @Get('top')
  async getTopChangeReady(@Query('limit') limit?: number) {
    return this.service.getTopChangeReady(limit ? Number(limit) : 50);
  }

  @Post(':candidateId/open-to-work')
  async setOpenToWork(
    @Param('candidateId') candidateId: string,
    @Body('openToWork') openToWork: boolean,
  ) {
    return this.service.setOpenToWork(candidateId, openToWork);
  }
}
