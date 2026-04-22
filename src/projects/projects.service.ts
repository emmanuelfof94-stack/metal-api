import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(status?: ProjectStatus) {
    return this.prisma.project.findMany({
      where: status ? { status } : undefined,
      include: { customer: true, _count: { select: { quotes: true, payments: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        customer: true,
        quotes: { include: { lines: true }, orderBy: { version: 'desc' } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    return project;
  }

  async create(dto: CreateProjectDto) {
    const reference = `PRJ-${Date.now()}`;
    const areaM2 = dto.widthM && dto.heightM ? dto.widthM * dto.heightM : undefined;

    return this.prisma.project.create({
      data: {
        reference,
        customerId: dto.customerId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        widthM: dto.widthM,
        heightM: dto.heightM,
        lengthM: dto.lengthM,
        areaM2,
        quantity: dto.quantity ?? 1,
        desiredMarginPercent: dto.desiredMarginPercent,
        expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : undefined,
        specificationJson: dto.specificationJson ?? {},
      },
      include: { customer: true },
    });
  }

  async update(id: string, dto: Partial<CreateProjectDto>) {
    await this.findOne(id);
    const areaM2 = dto.widthM && dto.heightM ? dto.widthM * dto.heightM : undefined;
    return this.prisma.project.update({
      where: { id },
      data: { ...dto, areaM2, expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : undefined },
    });
  }

  async updateStatus(id: string, status: ProjectStatus) {
    const project = await this.findOne(id);

    if (status === ProjectStatus.IN_PRODUCTION) {
      const acceptedQuote = project.quotes.find(q => q.status === 'ACCEPTED');
      if (!acceptedQuote) throw new BadRequestException('Un devis accepté est requis avant de lancer la production');
    }

    if (status === ProjectStatus.CLOSED || status === ProjectStatus.DELIVERED) {
      const totalPaid = project.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const acceptedQuote = project.quotes.find(q => q.status === 'ACCEPTED');
      if (acceptedQuote && totalPaid < Number(acceptedQuote.totalAmount)) {
        throw new BadRequestException('Paiement complet requis pour clôturer le projet');
      }
    }

    return this.prisma.project.update({ where: { id }, data: { status } });
  }

  async updateActualCost(id: string, actualCost: number) {
    await this.findOne(id);
    return this.prisma.project.update({ where: { id }, data: { actualCost } });
  }
}
