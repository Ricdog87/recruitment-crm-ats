import { Module } from '@nestjs/common';
import { PlzService } from './plz.service';

@Module({
  providers: [PlzService],
  exports: [PlzService],
})
export class PlzModule {}
