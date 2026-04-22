import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { DocumentsService } from './documents.service';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService, DocumentsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
