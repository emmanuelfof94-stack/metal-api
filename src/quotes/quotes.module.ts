import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { QuoteEngineService } from './quote-engine.service';
import { PricingModule } from '../pricing/pricing.module';
import { PdfService } from './pdf.service';

@Module({
  imports: [PricingModule],
  controllers: [QuotesController],
  providers: [QuotesService, QuoteEngineService, PdfService],
})
export class QuotesModule {}
