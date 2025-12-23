import { Module } from '@nestjs/common';
import { CVParsingService } from './cv-parsing.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CVParsingService],
  exports: [CVParsingService],
})
export class CVParsingModule {}
