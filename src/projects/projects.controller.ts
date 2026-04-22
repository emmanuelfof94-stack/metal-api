import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ProjectStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from './projects.service';
import { DocumentsService } from './documents.service';
import { CreateProjectDto } from './dto/create-project.dto';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly documentsService: DocumentsService,
  ) {}

  @Get()
  findAll(@Query('status') status?: ProjectStatus) {
    return this.projectsService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateProjectDto>) {
    return this.projectsService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: ProjectStatus) {
    return this.projectsService.updateStatus(id, status);
  }

  @Patch(':id/actual-cost')
  updateActualCost(@Param('id') id: string, @Body('actualCost') actualCost: number) {
    return this.projectsService.updateActualCost(id, actualCost);
  }

  @Get(':id/bon-commande')
  async bonCommande(@Param('id') id: string, @Res() res: Response) {
    const buf = await this.documentsService.generateBonCommande(id);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="bon-commande-${id}.pdf"` });
    res.end(buf);
  }

  @Get(':id/bon-livraison')
  async bonLivraison(@Param('id') id: string, @Res() res: Response) {
    const buf = await this.documentsService.generateBonLivraison(id);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="bon-livraison-${id}.pdf"` });
    res.end(buf);
  }
}
