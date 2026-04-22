import { Body, Controller, Delete, Get, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { QuoteStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QuotesService, AddQuoteLineDto } from './quotes.service';
import { QuoteEngineService } from './quote-engine.service';
import { PdfService } from './pdf.service';
import { GenerateQuoteDto } from './dto/generate-quote.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class QuotesController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly quoteEngineService: QuoteEngineService,
    private readonly pdfService: PdfService,
  ) {}

  @Post('quotes/generate')
  generate(@Body() dto: GenerateQuoteDto) {
    return this.quoteEngineService.generateQuote(dto);
  }

  @Get('quotes')
  findAll() {
    return this.quotesService.findAll();
  }

  @Get('quotes/:id')
  findOne(@Param('id') id: string) {
    return this.quotesService.findOne(id);
  }

  @Get('quotes/:id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const quote = await this.quotesService.findOne(id);
    const buffer = await this.pdfService.generate(quote as any);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="devis-${quote.project?.reference}-v${quote.version}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Patch('quotes/:id')
  update(@Param('id') id: string, @Body('notes') notes: string) {
    return this.quotesService.updateNotes(id, notes);
  }

  @Patch('quotes/:id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: QuoteStatus) {
    return this.quotesService.updateStatus(id, status);
  }

  @Get('projects/:id/quotes')
  findByProject(@Param('id') id: string) {
    return this.quotesService.findByProject(id);
  }

  @Post('quotes/:id/lines')
  addLine(@Param('id') id: string, @Body() dto: AddQuoteLineDto) {
    return this.quotesService.addLine(id, dto);
  }

  @Patch('quotes/:id/lines/:lineId')
  updateLine(@Param('id') id: string, @Param('lineId') lineId: string, @Body('quantity') quantity: number) {
    return this.quotesService.updateLine(id, lineId, quantity);
  }

  @Delete('quotes/:id/lines/:lineId')
  removeLine(@Param('id') id: string, @Param('lineId') lineId: string) {
    return this.quotesService.removeLine(id, lineId);
  }
}
