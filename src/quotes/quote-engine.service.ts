import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { GenerateQuoteDto, ManualAdjustmentDto } from './dto/generate-quote.dto';

interface QuoteLineInput {
  label: string;
  category: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  computed: boolean;
  formulaCode?: string;
}

@Injectable()
export class QuoteEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
  ) {}

  async generateQuote(input: GenerateQuoteDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: input.projectId },
      include: { customer: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');

    const width = Number(project.widthM ?? 0);
    const height = Number(project.heightM ?? 0);
    const area = width * height || Number(project.areaM2 ?? 0);
    const perimeter = 2 * (width + height);
    const qty = project.quantity ?? 1;

    const computedLines = await this.computeLinesByType(project.type, { width, height, area, perimeter, qty });
    const manualLines = this.buildManualLines(input.manualAdjustments ?? []);
    const allLines = [...computedLines, ...manualLines];

    const subtotalMaterial = this.sumByCategory(allLines, 'material');
    const subtotalLabor = this.sumByCategory(allLines, 'labor');
    const subtotalOther = this.sumByCategory(allLines, 'other');
    const subtotal = subtotalMaterial + subtotalLabor + subtotalOther;

    const marginPercent = Number(project.desiredMarginPercent ?? 20);
    const marginAmount = subtotal * (marginPercent / 100);
    const totalAmount = subtotal + marginAmount;

    const lastQuote = await this.prisma.quote.findFirst({
      where: { projectId: project.id },
      orderBy: { version: 'desc' },
    });
    const version = (lastQuote?.version ?? 0) + 1;

    const quote = await this.prisma.quote.create({
      data: {
        projectId: project.id,
        version,
        subtotalMaterial,
        subtotalLabor,
        subtotalOther,
        marginPercent,
        marginAmount,
        totalAmount,
        lines: {
          create: allLines.map((line, index) => ({
            label: line.label,
            category: line.category,
            unit: line.unit,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            totalPrice: line.quantity * line.unitPrice,
            computed: line.computed,
            formulaCode: line.formulaCode,
            sortOrder: index,
          })),
        },
      },
      include: { lines: true },
    });

    await this.prisma.project.update({
      where: { id: project.id },
      data: { estimatedPrice: totalAmount, status: 'QUOTE_DRAFT' },
    });

    return quote;
  }

  private async computeLinesByType(
    type: ProjectType,
    dims: { width: number; height: number; area: number; perimeter: number; qty: number },
  ): Promise<QuoteLineInput[]> {
    const { area, perimeter, qty } = dims;

    switch (type) {
      case ProjectType.DOOR:
        return this.linesForDoor(area, perimeter, qty);
      case ProjectType.GATE:
        return this.linesForGate(area, perimeter, qty);
      case ProjectType.WINDOW_GRILL:
        return this.linesForGrill(area, perimeter, qty);
      case ProjectType.ROOF_FRAME:
        return this.linesForRoofFrame(area, dims.width, qty);
      case ProjectType.METAL_BOX:
        return this.linesForMetalBox(area, perimeter, qty);
      default:
        return [];
    }
  }

  private async linesForDoor(area: number, perimeter: number, qty: number): Promise<QuoteLineInput[]> {
    return [
      { label: 'Tôle', category: 'material', unit: 'm²', quantity: area * qty, unitPrice: await this.pricingService.getPriceSafe('SHEET_M2'), computed: true, formulaCode: 'SHEET_M2' },
      { label: 'Tube cadre', category: 'material', unit: 'ml', quantity: perimeter * qty, unitPrice: await this.pricingService.getPriceSafe('FRAME_TUBE_ML'), computed: true, formulaCode: 'FRAME_TUBE_ML' },
      { label: 'Serrure', category: 'material', unit: 'unité', quantity: qty, unitPrice: await this.pricingService.getPriceSafe('LOCK_UNIT'), computed: true, formulaCode: 'LOCK_UNIT' },
      { label: 'Charnières', category: 'material', unit: 'unité', quantity: 2 * qty, unitPrice: await this.pricingService.getPriceSafe('HINGE_UNIT'), computed: true, formulaCode: 'HINGE_UNIT' },
      { label: 'Peinture', category: 'material', unit: 'm²', quantity: area * qty, unitPrice: await this.pricingService.getPriceSafe('PAINT_M2'), computed: true, formulaCode: 'PAINT_M2' },
      { label: 'Main d\'œuvre fabrication', category: 'labor', unit: 'm²', quantity: area * qty, unitPrice: await this.pricingService.getPriceSafe('LABOR_DOOR_M2'), computed: true, formulaCode: 'LABOR_DOOR_M2' },
      { label: 'Transport', category: 'other', unit: 'forfait', quantity: 1, unitPrice: await this.pricingService.getPriceSafe('TRANSPORT_FIXED'), computed: true, formulaCode: 'TRANSPORT_FIXED' },
    ];
  }

  private async linesForGate(area: number, perimeter: number, qty: number): Promise<QuoteLineInput[]> {
    return [
      { label: 'Tôle / lames', category: 'material', unit: 'm²', quantity: area * qty, unitPrice: await this.pricingService.getPriceSafe('SHEET_M2'), computed: true, formulaCode: 'SHEET_M2' },
      { label: 'Tube cadre principal', category: 'material', unit: 'ml', quantity: perimeter * qty, unitPrice: await this.pricingService.getPriceSafe('FRAME_TUBE_ML'), computed: true, formulaCode: 'FRAME_TUBE_ML' },
      { label: 'Serrure portail', category: 'material', unit: 'unité', quantity: qty, unitPrice: await this.pricingService.getPriceSafe('LOCK_UNIT'), computed: true, formulaCode: 'LOCK_UNIT' },
      { label: 'Peinture', category: 'material', unit: 'm²', quantity: area * qty, unitPrice: await this.pricingService.getPriceSafe('PAINT_M2'), computed: true, formulaCode: 'PAINT_M2' },
      { label: 'Main d\'œuvre fabrication', category: 'labor', unit: 'm²', quantity: area * qty, unitPrice: await this.pricingService.getPriceSafe('LABOR_GATE_M2'), computed: true, formulaCode: 'LABOR_GATE_M2' },
      { label: 'Transport', category: 'other', unit: 'forfait', quantity: 1, unitPrice: await this.pricingService.getPriceSafe('TRANSPORT_FIXED'), computed: true, formulaCode: 'TRANSPORT_FIXED' },
    ];
  }

  private async linesForGrill(area: number, perimeter: number, qty: number): Promise<QuoteLineInput[]> {
    return [
      { label: 'Tube cadre', category: 'material', unit: 'ml', quantity: perimeter * qty, unitPrice: await this.pricingService.getPriceSafe('FRAME_TUBE_ML'), computed: true, formulaCode: 'FRAME_TUBE_ML' },
      { label: 'Barreaux', category: 'material', unit: 'ml', quantity: area * 4 * qty, unitPrice: await this.pricingService.getPriceSafe('FRAME_TUBE_ML'), computed: true, formulaCode: 'FRAME_TUBE_ML' },
      { label: 'Peinture', category: 'material', unit: 'm²', quantity: area * qty, unitPrice: await this.pricingService.getPriceSafe('PAINT_M2'), computed: true, formulaCode: 'PAINT_M2' },
      { label: 'Main d\'œuvre', category: 'labor', unit: 'm²', quantity: area * qty, unitPrice: await this.pricingService.getPriceSafe('LABOR_GRILL_M2'), computed: true, formulaCode: 'LABOR_GRILL_M2' },
      { label: 'Transport', category: 'other', unit: 'forfait', quantity: 1, unitPrice: await this.pricingService.getPriceSafe('TRANSPORT_FIXED'), computed: true, formulaCode: 'TRANSPORT_FIXED' },
    ];
  }

  private async linesForRoofFrame(area: number, width: number, qty: number): Promise<QuoteLineInput[]> {
    const structureLength = width > 0 ? area / width : area;
    return [
      { label: 'Structure principale (ml)', category: 'material', unit: 'ml', quantity: structureLength * qty, unitPrice: await this.pricingService.getPriceSafe('FRAME_TUBE_ML'), computed: true, formulaCode: 'FRAME_TUBE_ML' },
      { label: 'Tôle de couverture', category: 'material', unit: 'm²', quantity: area * qty, unitPrice: await this.pricingService.getPriceSafe('SHEET_M2'), computed: true, formulaCode: 'SHEET_M2' },
      { label: 'Peinture anti-rouille', category: 'material', unit: 'm²', quantity: area * qty, unitPrice: await this.pricingService.getPriceSafe('PAINT_M2'), computed: true, formulaCode: 'PAINT_M2' },
      { label: 'Main d\'œuvre charpente', category: 'labor', unit: 'm²', quantity: area * qty, unitPrice: await this.pricingService.getPriceSafe('LABOR_GATE_M2'), computed: true, formulaCode: 'LABOR_GATE_M2' },
      { label: 'Transport', category: 'other', unit: 'forfait', quantity: 1, unitPrice: await this.pricingService.getPriceSafe('TRANSPORT_FIXED'), computed: true, formulaCode: 'TRANSPORT_FIXED' },
    ];
  }

  private async linesForMetalBox(area: number, perimeter: number, qty: number): Promise<QuoteLineInput[]> {
    return [
      { label: 'Panneaux tôle', category: 'material', unit: 'm²', quantity: area * 4 * qty, unitPrice: await this.pricingService.getPriceSafe('SHEET_M2'), computed: true, formulaCode: 'SHEET_M2' },
      { label: 'Structure montants', category: 'material', unit: 'ml', quantity: perimeter * 3 * qty, unitPrice: await this.pricingService.getPriceSafe('FRAME_TUBE_ML'), computed: true, formulaCode: 'FRAME_TUBE_ML' },
      { label: 'Serrure', category: 'material', unit: 'unité', quantity: qty, unitPrice: await this.pricingService.getPriceSafe('LOCK_UNIT'), computed: true, formulaCode: 'LOCK_UNIT' },
      { label: 'Peinture', category: 'material', unit: 'm²', quantity: area * 4 * qty, unitPrice: await this.pricingService.getPriceSafe('PAINT_M2'), computed: true, formulaCode: 'PAINT_M2' },
      { label: 'Main d\'œuvre fabrication', category: 'labor', unit: 'm²', quantity: area * qty, unitPrice: await this.pricingService.getPriceSafe('LABOR_GATE_M2'), computed: true, formulaCode: 'LABOR_GATE_M2' },
      { label: 'Transport et montage', category: 'other', unit: 'forfait', quantity: 1, unitPrice: await this.pricingService.getPriceSafe('TRANSPORT_FIXED'), computed: true, formulaCode: 'TRANSPORT_FIXED' },
    ];
  }

  private buildManualLines(adjustments: ManualAdjustmentDto[]): QuoteLineInput[] {
    return adjustments.map(a => ({
      label: a.label,
      category: a.category,
      unit: 'unité',
      quantity: a.quantity,
      unitPrice: a.unitPrice,
      computed: false,
    }));
  }

  private sumByCategory(lines: QuoteLineInput[], category: string): number {
    return lines
      .filter(l => l.category === category)
      .reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  }
}
