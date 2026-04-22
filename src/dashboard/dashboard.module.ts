import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { ExportService } from './export.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, ExportService],
})
export class DashboardModule {}
