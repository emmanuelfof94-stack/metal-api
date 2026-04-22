import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { ExportService } from './export.service';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly exportService: ExportService,
  ) {}

  @Get('summary')
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('alerts')
  getAlerts() {
    return this.dashboardService.getAlerts();
  }

  @Get('profitability')
  getProfitability() {
    return this.dashboardService.getProfitability();
  }

  @Get('export/projects')
  async exportProjects(@Res() res: Response) {
    const buf = await this.exportService.exportProjects();
    res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="projets.xlsx"' });
    res.end(buf);
  }

  @Get('export/payments')
  async exportPayments(@Res() res: Response) {
    const buf = await this.exportService.exportPayments();
    res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="paiements.xlsx"' });
    res.end(buf);
  }

  @Get('export/rentabilite')
  async exportRentabilite(@Res() res: Response) {
    const buf = await this.exportService.exportRentabilite();
    res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="rentabilite.xlsx"' });
    res.end(buf);
  }
}
