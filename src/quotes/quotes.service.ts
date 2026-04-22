import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { QuoteStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export class AddQuoteLineDto {
  label: string;
  category: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
}

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: { lines: { orderBy: { sortOrder: 'asc' } }, project: { include: { customer: true } } },
    });
    if (!quote) throw new NotFoundException('Devis introuvable');
    return quote;
  }

  findAll() {
    return this.prisma.quote.findMany({
      include: { lines: { orderBy: { sortOrder: 'asc' } }, project: { include: { customer: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByProject(projectId: string) {
    return this.prisma.quote.findMany({
      where: { projectId },
      include: { lines: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { version: 'desc' },
    });
  }

  async updateStatus(id: string, status: QuoteStatus) {
    const quote = await this.findOne(id);

    if (status === QuoteStatus.ACCEPTED) {
      await this.prisma.quote.updateMany({
        where: { projectId: quote.projectId, id: { not: id } },
        data: { status: QuoteStatus.REJECTED },
      });
      await this.prisma.project.update({
        where: { id: quote.projectId },
        data: { status: 'QUOTE_ACCEPTED', estimatedPrice: quote.totalAmount },
      });
    }

    return this.prisma.quote.update({ where: { id }, data: { status } });
  }

  async updateNotes(id: string, notes: string) {
    await this.findOne(id);
    return this.prisma.quote.update({ where: { id }, data: { notes } });
  }

  async addLine(quoteId: string, dto: AddQuoteLineDto) {
    const quote = await this.findOne(quoteId);
    if (quote.status !== 'DRAFT') throw new BadRequestException('Seul un devis en brouillon peut être modifié');

    const totalPrice = dto.quantity * dto.unitPrice;
    const maxSort = Math.max(0, ...quote.lines.map((l: any) => l.sortOrder ?? 0));

    await this.prisma.quoteLine.create({
      data: {
        quoteId,
        label: dto.label,
        category: dto.category,
        unit: dto.unit ?? 'U',
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        totalPrice,
        computed: false,
        sortOrder: maxSort + 1,
      },
    });

    return this.recalculate(quoteId);
  }

  async removeLine(quoteId: string, lineId: string) {
    const quote = await this.findOne(quoteId);
    if (quote.status !== 'DRAFT') throw new BadRequestException('Seul un devis en brouillon peut être modifié');

    await this.prisma.quoteLine.delete({ where: { id: lineId } });
    return this.recalculate(quoteId);
  }

  async updateLine(quoteId: string, lineId: string, quantity: number) {
    const quote = await this.findOne(quoteId);
    if (quote.status !== 'DRAFT') throw new BadRequestException('Seul un devis en brouillon peut être modifié');

    const line = await this.prisma.quoteLine.findUnique({ where: { id: lineId } });
    if (!line || line.quoteId !== quoteId) throw new NotFoundException('Ligne introuvable');

    await this.prisma.quoteLine.update({
      where: { id: lineId },
      data: { quantity, totalPrice: quantity * Number(line.unitPrice) },
    });

    return this.recalculate(quoteId);
  }

  private async recalculate(quoteId: string) {
    const lines = await this.prisma.quoteLine.findMany({ where: { quoteId } });

    const sum = (cat: string) =>
      lines.filter(l => l.category === cat).reduce((s, l) => s + Number(l.totalPrice), 0);

    const subtotalMaterial = sum('material');
    const subtotalLabor = sum('labor');
    const subtotalOther = sum('other');
    const subtotal = subtotalMaterial + subtotalLabor + subtotalOther;

    const quote = await this.prisma.quote.findUnique({ where: { id: quoteId } });
    const marginPercent = Number(quote!.marginPercent);
    const marginAmount = subtotal * (marginPercent / 100);
    const totalAmount = subtotal + marginAmount;

    return this.prisma.quote.update({
      where: { id: quoteId },
      data: { subtotalMaterial, subtotalLabor, subtotalOther, marginAmount, totalAmount },
      include: { lines: { orderBy: { sortOrder: 'asc' } } },
    });
  }
}
