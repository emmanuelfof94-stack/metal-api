import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePricingItemDto } from './dto/create-pricing-item.dto';

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(category?: string) {
    return this.prisma.pricingItem.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async getPrice(code: string): Promise<number> {
    const item = await this.prisma.pricingItem.findUnique({ where: { code, active: true } });
    if (!item) throw new NotFoundException(`Prix introuvable pour le code: ${code}`);
    return Number(item.unitPrice);
  }

  async getPriceSafe(code: string): Promise<number> {
    const item = await this.prisma.pricingItem.findUnique({ where: { code, active: true } });
    return item ? Number(item.unitPrice) : 0;
  }

  create(dto: CreatePricingItemDto) {
    return this.prisma.pricingItem.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreatePricingItemDto>) {
    const item = await this.prisma.pricingItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Article de prix introuvable');
    return this.prisma.pricingItem.update({ where: { id }, data: dto });
  }

  async seedDefaultPrices() {
    const defaults = [
      { code: 'SHEET_M2', name: 'Tôle (par m²)', category: 'material', unit: 'm²', ruleType: 'PER_SQM' as const, unitPrice: 8000 },
      { code: 'FRAME_TUBE_ML', name: 'Tube cadre (par ml)', category: 'material', unit: 'ml', ruleType: 'PER_LINEAR_METER' as const, unitPrice: 3500 },
      { code: 'LOCK_UNIT', name: 'Serrure (unité)', category: 'material', unit: 'unité', ruleType: 'PER_UNIT' as const, unitPrice: 15000 },
      { code: 'PAINT_M2', name: 'Peinture (par m²)', category: 'material', unit: 'm²', ruleType: 'PER_SQM' as const, unitPrice: 2500 },
      { code: 'HINGE_UNIT', name: 'Charnière (unité)', category: 'material', unit: 'unité', ruleType: 'PER_UNIT' as const, unitPrice: 3000 },
      { code: 'LABOR_DOOR_M2', name: 'Main d\'œuvre porte (par m²)', category: 'labor', unit: 'm²', ruleType: 'PER_SQM' as const, unitPrice: 12000 },
      { code: 'LABOR_GATE_M2', name: 'Main d\'œuvre portail (par m²)', category: 'labor', unit: 'm²', ruleType: 'PER_SQM' as const, unitPrice: 15000 },
      { code: 'LABOR_GRILL_M2', name: 'Main d\'œuvre grille (par m²)', category: 'labor', unit: 'm²', ruleType: 'PER_SQM' as const, unitPrice: 10000 },
      { code: 'TRANSPORT_FIXED', name: 'Transport (forfait)', category: 'other', unit: 'forfait', ruleType: 'FIXED' as const, unitPrice: 10000 },
    ];

    for (const item of defaults) {
      await this.prisma.pricingItem.upsert({
        where: { code: item.code },
        update: {},
        create: item,
      });
    }
    return { message: 'Prix par défaut créés avec succès' };
  }
}
