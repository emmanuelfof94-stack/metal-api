import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PricingService } from './pricing.service';
import { CreatePricingItemDto } from './dto/create-pricing-item.dto';

@UseGuards(JwtAuthGuard)
@Controller('pricing-items')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get()
  findAll(@Query('category') category?: string) {
    return this.pricingService.findAll(category);
  }

  @Post()
  create(@Body() dto: CreatePricingItemDto) {
    return this.pricingService.create(dto);
  }

  @Post('seed')
  seed() {
    return this.pricingService.seedDefaultPrices();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreatePricingItemDto>) {
    return this.pricingService.update(id, dto);
  }
}
